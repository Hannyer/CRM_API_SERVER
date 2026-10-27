const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const secret = 'synthetic-test-secret-with-at-least-32-characters';
const userId = '11111111-1111-4111-8111-111111111111';
const roleId = '22222222-2222-4222-8222-222222222222';
function load(relative, stubs = {}, env = {}) {
  const filename = path.join(root, relative);
  const module = { exports: {} };
  const context = { module, exports: module.exports, process: { env }, Buffer, URL, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout };
  context.require = name => Object.hasOwn(stubs, name) ? stubs[name] : createRequire(filename)(name);
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  return module.exports;
}
function response() {
  return { code: 200, headers: {}, set(k,v) { this.headers[k]=v; return this; }, status(code) { this.code=code;return this; }, json(body) {this.body=body;return this;} };
}
const { hashPassword, verifyPassword, isModernHash } = require('../src/utils/password');
const { encrypt } = require('../src/utils/crypto-compat');
const { sessionVersion } = require('../src/utils/session-version');
const jwt = require('jsonwebtoken');

test('scrypt uses distinct salts and accepts only the matching password', async () => {
  const first = await hashPassword('synthetic-password');
  const second = await hashPassword('synthetic-password');
  assert.notEqual(first, second);assert.equal(isModernHash(first),true);
  assert.equal(await verifyPassword('synthetic-password',first),true);
  assert.equal(await verifyPassword('incorrect-password',first),false);
  assert.equal(await verifyPassword('synthetic-password','scrypt$v1$broken'),false);
});
test('legacy passwords remain readable while new writes enforce length', async () => {
  assert.equal(await verifyPassword('short',encrypt('short')),true);
  const migrated=await hashPassword('short',{legacyMigration:true});
  assert.equal(await verifyPassword('short',migrated),true);
  await assert.rejects(hashPassword('short'),error=>error.status===400);
  assert.equal(await verifyPassword({},'legacy'),false);
});
test('JWT config rejects missing, public and short secrets', () => {
  for (const env of [{},{JWT_SECRET:'secret'},{JWT_SECRET:'short',NODE_ENV:'production'}]) assert.throws(()=>load('src/config/jwt.js',{},env));
  assert.equal(load('src/config/jwt.js',{}, {JWT_SECRET:secret}).JWT_SECRET,secret);
});
test('sessions reject disabled users, changed passwords, changed roles and old tokens', async () => {
  const user={id:userId,role_id:roleId,password_hash:'synthetic-hash',status:true};
  let current={...user};
  const middleware=load('src/middlewares/auth.middleware.js',{
    '../config/jwt':{JWT_SECRET:secret},'../repository/user.repository':{getAuthUserById:async()=>current},'../services/security.service':{},
  });
  const claims={id:userId,roleId,sv:sessionVersion(user,secret)};
  async function run(payload) {
    let continued=false;const res=response();
    await middleware.verifyToken({headers:{authorization:'Bearer '+jwt.sign(payload,secret,{algorithm:'HS256'})}},res,()=>{continued=true;});
    return {continued,res};
  }
  assert.equal((await run(claims)).continued,true);
  for(const updated of [{...user,status:false},{...user,password_hash:'new-hash'},{...user,role_id:userId},null]) {
    current=updated;const result=await run(claims);assert.equal(result.continued,false);assert.equal(result.res.code,401);
  }
  current=user;assert.equal((await run({id:userId,roleId})).res.code,401);
});
test('inactive permissions are rejected and HEAD requires read permission', async () => {
  let item={code:'security',canRead:false,canWrite:true,permissionStatus:false};
  const middleware=load('src/middlewares/auth.middleware.js',{'../config/jwt':{JWT_SECRET:secret},'../repository/user.repository':{},'../services/security.service':{getPermissionsByRoleId:async()=>({items:[item]})}});
  async function run(method){let next=false;const res=response();await middleware.requirePermission('security')({method,user:{roleId}},res,()=>{next=true;});return {next,res};}
  assert.equal((await run('PUT')).res.code,403);
  item={...item,permissionStatus:true};assert.equal((await run('HEAD')).res.code,403);assert.equal((await run('PUT')).next,true);
});
test('each administrative mutation installs a permission gate', () => {
  for(const name of ['security','activity-types','companies','config','languages','payment-types','card-types']) {
    const registered=[];const router={use(){}};
    for(const method of ['get','put','post','patch','delete'])router[method]=(route,...handlers)=>registered.push({method,route,handlers});
    const gate=()=>{};
    const stubs={express:{Router:()=>router},'../middlewares/auth.middleware':{verifyToken(){},requirePermission:()=>gate},'../middlewares/subscription.middleware':{requireCrmEntitlement:()=>()=>{}}};
    const controller=new Proxy({},{get:()=>()=>{}});stubs[`../controllers/${name==='security'?'security':name}.controller`]=controller;
    load(`src/routes/${name}.routes.js`,stubs);
    const mutations=registered.filter(r=>['put','post','patch','delete'].includes(r.method));
    assert.ok(mutations.length>0,name);
    for(const route of mutations)assert.ok(route.handlers.includes(gate),name+' '+route.route);
  }
});
test('cancelled reservations must recheck capacity and roll back when full', async () => {
  const queries=[];
  const client={async query(sql){queries.push(sql);
    if(sql.includes('FROM ops.booking WHERE'))return {rowCount:1,rows:[{activity_schedule_id:userId,number_of_people:3,status:'cancelled'}]};
    if(sql.includes('SELECT s.id'))return {rowCount:1,rows:[{id:userId}]};
    if(sql.includes('AS party_size'))return {rows:[{party_size:5,booked:5}]};
    return {rows:[],rowCount:0};},release(){}};
  const repo=load('src/repository/bookings.repository.js',{'../config/db.pg':{pool:{connect:async()=>client}}});
  await assert.rejects(repo.updateBooking(userId,{status:'confirmed'}),error=>error.code==='NO_CAPACITY');
  assert.ok(queries.some(sql=>sql.includes('FOR UPDATE')&&sql.includes('activity_schedule')));
  assert.ok(queries.includes('ROLLBACK'));assert.equal(queries.some(sql=>sql.includes('UPDATE ops.booking')),false);
});
test('reactivating a reservation with enough capacity commits successfully', async () => {
  const queries=[];
  const client={async query(sql){queries.push(sql);
    if(sql.includes('FROM ops.booking WHERE'))return {rowCount:1,rows:[{activity_schedule_id:userId,number_of_people:3,status:'cancelled'}]};
    if(sql.includes('SELECT s.id'))return {rowCount:1,rows:[{id:userId}]};
    if(sql.includes('AS party_size'))return {rows:[{party_size:8,booked:2}]};
    if(sql.includes('UPDATE ops.booking'))return {rows:[{id:userId,status:'confirmed'}]};return {rows:[]};},release(){}};
  const repo=load('src/repository/bookings.repository.js',{'../config/db.pg':{pool:{connect:async()=>client}}});
  assert.equal((await repo.updateBooking(userId,{status:'confirmed'})).status,'confirmed');assert.ok(queries.includes('COMMIT'));
});
test('reset consumes the token atomically and allows only one concurrent success', async () => {
  let consumed=false,updates=0;
  const service=load('src/services/password-reset.service.js',{
    '../repository/user.repository':{consumePasswordResetToken:async()=>{if(consumed)return null;consumed=true;updates++;return {id:userId};}},
    '../utils/password':{hashPassword:async()=> 'scrypt-test'},'./mail.service':{sendMail(){},isMailConfigured:()=>true,escapeHtml:x=>x},
  });
  const results=await Promise.allSettled([service.resetPassword({token:'a'.repeat(64),newPassword:'valid-one'}),service.resetPassword({token:'a'.repeat(64),newPassword:'valid-two'})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(updates,1);
  let query;
  const repo=load('src/repository/user.repository.js',{'../config/db.pg':{pool:{query:async(sql)=>{query=sql;return {rows:[{id:userId}]};}}},'../repository/user-languages.repository':{LANGUAGE_JSON_AGG:''},'./user-languages.repository':{LANGUAGE_JSON_AGG:''},'./user-licenses.repository':{USER_LICENSE_JSON_AGG:'',setUserLicenses(){}}});
  await repo.consumePasswordResetToken('synthetic-token-hash','synthetic-password-hash');
  assert.match(query,/UPDATE ops.app_user/);assert.match(query,/WHERE password_reset_token_hash = \$1/);assert.match(query,/password_reset_expires_at > CURRENT_TIMESTAMP/);
});
test('transport service rejects insufficient seats and inactive or incorrect-role drivers', async () => {
  let capacity=2;let driver={status:true,roleId};let saved=0;
  const service=load('src/services/booking-assignments.service.js',{
    '../repository/booking-assignments.repository':{setBookingTransport:async()=>{saved++;return {saved:true};}},
    '../repository/bookings.repository':{getBookingById:async()=>({status:'pending',transport:true,passengerCount:20,referencePointDescription:'Pickup'})},
    '../repository/transport.repository':{getTransportById:async()=>({capacity,status:true,operationalStatus:true})},
    '../repository/reference-points.repository':{},'../repository/user.repository':{getUserById:async()=>driver},'./config.service':{getConductorRoleId:async()=>roleId},
  });
  const run=()=>service.assignTransport(userId,roleId,userId,null,'2026-12-01T10:00:00Z');
  await assert.rejects(run(),e=>e.code==='TRANSPORT_CAPACITY');
  capacity=25;driver={status:false,roleId};await assert.rejects(run(),e=>e.code==='INVALID_DRIVER');
  driver={status:true,roleId:userId};await assert.rejects(run(),e=>e.code==='INVALID_DRIVER');
  driver={status:true,roleId};await run();assert.equal(saved,1);
});
test('transport repository revalidates capacity before deleting the old assignment', async () => {
  const queries=[];
  const client={async query(sql){queries.push(sql);if(sql.includes('FROM ops.booking WHERE'))return {rows:[{status:'pending',transport:true,passengers:20}]};if(sql.includes('FROM ops.transport'))return {rows:[{capacity:2}]};return {rows:[]};},release(){}};
  const repo=load('src/repository/booking-assignments.repository.js',{'../config/db.pg':{pool:{connect:async()=>client}}});
  await assert.rejects(repo.setBookingTransport(userId,roleId,userId,null,'2026-12-01T10:00:00Z',roleId),e=>e.code==='TRANSPORT_CAPACITY');
  assert.ok(queries.includes('ROLLBACK'));assert.equal(queries.some(q=>q.includes('DELETE FROM')),false);
});
test('unexpected internal errors are generic while known validation remains useful', () => {
  const {formatError}=require('../src/utils/errorHandler');
  assert.equal(formatError(new Error('synthetic internal topology'),500,'Error publico').message,'Error publico');
  assert.equal(formatError({code:'23505',message:'sensitive table'}).status,409);
});
test('database TLS verifies certificates and cannot be overridden by URL sslmode', () => {
  const {databaseOptions}=require('../src/config/database-options');
  const options=databaseOptions({NODE_ENV:'production',DATABASE_URL:'postgres://user:synthetic@db.example/test?sslmode=require',DATABASE_SSL_CA:'line1\\nline2'});
  assert.equal(options.ssl.rejectUnauthorized,true);assert.equal(new URL(options.connectionString).searchParams.has('sslmode'),false);
  assert.equal(options.ssl.ca,'line1\nline2');
  assert.throws(()=>databaseOptions({NODE_ENV:'production',DATABASE_URL:'postgres://localhost/test?sslmode=disable'}));
  assert.throws(()=>databaseOptions({NODE_ENV:'production',DATABASE_URL:'postgres://db.example/test',NODE_TLS_REJECT_UNAUTHORIZED:'0'}));
  assert.equal(databaseOptions({DATABASE_URL:'postgres://localhost/test'}).ssl,false);
});
test('rate limit rejects excess attempts and resets after its window', () => {
  const {rateLimit}=require('../src/middlewares/rate-limit.middleware');let time=0;
  const gate=rateLimit({windowMs:1000,max:2,identity:true,now:()=>time});const req={ip:'127.0.0.1',body:{username:'USER@example.test'}};
  let count=0;gate(req,response(),()=>count++);gate(req,response(),()=>count++);const denied=response();gate(req,denied,()=>count++);
  assert.equal(count,2);assert.equal(denied.code,429);assert.equal(denied.headers['Retry-After'],'1');
  time=1001;gate(req,response(),()=>count++);assert.equal(count,3);
});
test('login migrates a legacy password and issues a revocable session', async () => {
  const user={id:userId,role_id:roleId,password_hash:encrypt('legacy-short'),status:true,email:'synthetic@example.test'};
  let writes=0;
  const controller=load('src/controllers/auth.controller.js',{
    '../services/users.service':{findByEmail:async()=>({...user})},
    '../services/config.service':{getRolClienteValue:async()=>null},'../services/password-reset.service':{},
    '../config/jwt':{JWT_SECRET:secret},
    '../repository/user.repository':{upgradePasswordHash:async(_id,previous,next)=>{assert.equal(previous,user.password_hash);user.password_hash=next;writes++;return {id:userId};},getAuthUserById:async()=>({...user})},
  });
  let res=response();await controller.login({body:{username:user.email,password:'legacy-short'}},res);
  assert.equal(res.code,200);assert.equal(writes,1);assert.ok(isModernHash(user.password_hash));
  const claims=jwt.verify(res.body.token,secret);assert.equal(claims.sv,sessionVersion(user,secret));
  res=response();await controller.login({body:{username:user.email,password:'wrong-password'}},res);assert.equal(res.code,401);assert.equal(writes,1);
});
test('CORS permits only configured browser origins on actual API responses', async () => {
  const express=require('express');const routes=express.Router();routes.get('/probe',(_req,res)=>res.json({ok:true}));
  const app=load('app.js',{'./src/routes':routes,'./src/config/swagger':{specs:{openapi:'3.0.0',info:{title:'Test',version:'1'},paths:{}}}}, {CORS_ORIGINS:'https://allowed.example'});
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  try {
    const url=`http://127.0.0.1:${server.address().port}/api/probe`;
    const allowed=await fetch(url,{headers:{Origin:'https://allowed.example'}});assert.equal(allowed.headers.get('access-control-allow-origin'),'https://allowed.example');
    const denied=await fetch(url,{headers:{Origin:'https://unlisted.example'}});assert.equal(denied.headers.get('access-control-allow-origin'),null);
    const preflight=await fetch(url,{method:'OPTIONS',headers:{Origin:'https://allowed.example','Access-Control-Request-Method':'PUT'}});assert.equal(preflight.status,204);
  } finally {server.closeAllConnections();server.close();}
});
