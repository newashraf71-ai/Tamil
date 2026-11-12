const express=require('express');
const session=require('express-session');
const helmet=require('helmet');
const bcrypt=require('bcryptjs');
const fs=require('fs');
const path=require('path');
const {Low}=require('lowdb');
const {JSONFile}=require('lowdb/node');
const mongoose=require('mongoose');
const app=express();
const PORT=process.env.PORT||3000;
const dataDir=path.join(__dirname,'data'); fs.mkdirSync(dataDir,{recursive:true});
const adapter=new JSONFile(path.join(dataDir,'db.json'));
const db=new Low(adapter,{users:[],products:[],orders:[]});
let mongoMode=false;
const ProductSchema=new mongoose.Schema({name:String,category:String,price:Number,description:String,image:String,deliveryText:String,active:Boolean},{timestamps:true});
const UserSchema=new mongoose.Schema({name:String,email:{type:String,unique:true},passwordHash:String,role:String},{timestamps:true});
const OrderSchema=new mongoose.Schema({userId:String,userEmail:String,productId:String,productName:String,amount:Number,status:String,paymentRef:String,createdAt:Date},{timestamps:true});
let Models={};
async function init(){
 if(process.env.MONGODB_URI){
  await mongoose.connect(process.env.MONGODB_URI);
  Models={Product:mongoose.model('Product',ProductSchema),User:mongoose.model('User',UserSchema),Order:mongoose.model('Order',OrderSchema)};
  mongoMode=true;
 } else { await db.read(); db.data ||= {users:[],products:[],orders:[]}; }
 const adminEmail=(process.env.ADMIN_EMAIL||'admin@tamilvip.store').toLowerCase();
 const adminPass=process.env.ADMIN_PASSWORD||'ChangeMe123!';
 if(mongoMode){
  if(!await Models.User.findOne({email:adminEmail})) await Models.User.create({name:'TAMIL VIP Admin',email:adminEmail,passwordHash:await bcrypt.hash(adminPass,12),role:'admin'});
  if(await Models.Product.countDocuments()===0) await Models.Product.insertMany(seedProducts);
 }else{
  if(!db.data.users.some(u=>u.email===adminEmail)) db.data.users.push({id:'admin',name:'TAMIL VIP Admin',email:adminEmail,passwordHash:await bcrypt.hash(adminPass,12),role:'admin'});
  if(!db.data.products.length) db.data.products=seedProducts.map((p,i)=>({...p,id:String(i+1),active:true}));
  await db.write();
 }
}
const seedProducts=[
 {name:'TAMIL VIP ANDROID PANEL',category:'ANDROID',price:79,description:'Digital access product. Delivery is confirmed by the store administrator.',image:'',deliveryText:'Your access details will be shared after order verification.',active:true},
 {name:'NEXT LEVEL CORP PC',category:'PC',price:399,description:'PC digital product. Contact support after placing your order.',image:'',deliveryText:'Your access details will be shared after order verification.',active:true},
 {name:'DRIP CLIENT WIRE ANDROID',category:'ANDROID',price:0,description:'Contact admin to confirm availability and pricing.',image:'',deliveryText:'Admin will contact you.',active:true},
 {name:'9X NON ROOT',category:'ANDROID',price:459,description:'Digital access product. Delivery is confirmed by the store administrator.',image:'',deliveryText:'Your access details will be shared after order verification.',active:true},
 {name:'FLUORITE FF iOS',category:'IOS',price:449,description:'iOS digital product. Contact support for compatibility details.',image:'',deliveryText:'Your access details will be shared after order verification.',active:true},
 {name:'REDMI AND POCO PANEL',category:'ANDROID',price:399,description:'Digital access product for supported devices.',image:'',deliveryText:'Your access details will be shared after order verification.',active:true},
 {name:'DRIP CLIENT ANDROID',category:'ANDROID',price:399,description:'Digital access product. Delivery is confirmed by the store administrator.',image:'',deliveryText:'Your access details will be shared after order verification.',active:true},
 {name:'PATO TEAM ANDROID',category:'ANDROID',price:399,description:'Digital access product. Delivery is confirmed by the store administrator.',image:'',deliveryText:'Your access details will be shared after order verification.',active:true}
];
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'1mb'}));
app.use(session({secret:process.env.SESSION_SECRET||'dev-only-change-me',resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:7*864e5}}));
app.use(express.static(path.join(__dirname,'public')));
const id=()=>Math.random().toString(36).slice(2,11);
async function all(collection,filter={}){if(mongoMode)return Models[collection].find(filter).sort({createdAt:-1}).lean();return db.data[collection.toLowerCase()+'s'].filter(x=>Object.entries(filter).every(([k,v])=>x[k]===v));}
async function save(collection,obj){if(mongoMode){const M=Models[collection];return (await M.create(obj)).toObject();}const key=collection.toLowerCase()+'s';const item={id:id(),createdAt:new Date().toISOString(),...obj};db.data[key].push(item);await db.write();return item;}
async function update(collection,recordId,patch){if(mongoMode)return Models[collection].findByIdAndUpdate(recordId,patch,{new:true}).lean();const key=collection.toLowerCase()+'s';const item=db.data[key].find(x=>x.id===recordId);if(!item)return null;Object.assign(item,patch);await db.write();return item;}
function safeUser(u){return {id:String(u.id||u._id),name:u.name,email:u.email,role:u.role};}
function auth(req,res,next){if(!req.session.user)return res.status(401).json({error:'Please sign in first.'});next();}
function admin(req,res,next){if(!req.session.user||req.session.user.role!=='admin')return res.status(403).json({error:'Admin access required.'});next();}
app.get('/api/health',(req,res)=>res.json({ok:true,storage:mongoMode?'mongodb':'json-file'}));
app.get('/api/me',(req,res)=>res.json({user:req.session.user||null}));
app.post('/api/register',async(req,res)=>{try{const {name,email,password}=req.body||{};if(!name||!email||!password||password.length<8)return res.status(400).json({error:'Enter name, email and password (minimum 8 characters).'});const e=email.toLowerCase().trim();const exists=mongoMode?await Models.User.findOne({email:e}):db.data.users.find(u=>u.email===e);if(exists)return res.status(409).json({error:'Email already registered.'});const u=await save('User',{name:name.trim(),email:e,passwordHash:await bcrypt.hash(password,12),role:'user'});req.session.user=safeUser(u);res.json({user:req.session.user});}catch(e){res.status(500).json({error:'Could not create account.'});}});
app.post('/api/login',async(req,res)=>{try{const e=String(req.body.email||'').toLowerCase().trim();const u=mongoMode?await Models.User.findOne({email:e}).lean():db.data.users.find(x=>x.email===e);if(!u||!await bcrypt.compare(String(req.body.password||''),u.passwordHash))return res.status(401).json({error:'Invalid email or password.'});req.session.user=safeUser(u);res.json({user:req.session.user});}catch(e){res.status(500).json({error:'Login failed.'});}});
app.post('/api/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/products',async(req,res)=>{const p=await all('Product',mongoMode?{active:true}:{});res.json(p.filter(x=>x.active!==false));});
app.get('/api/products/:id',async(req,res)=>{let p;if(mongoMode)p=await Models.Product.findById(req.params.id).lean();else p=db.data.products.find(x=>x.id===req.params.id);if(!p||p.active===false)return res.status(404).json({error:'Product not found.'});res.json(p);});
app.post('/api/orders',auth,async(req,res)=>{try{const p=mongoMode?await Models.Product.findById(req.body.productId).lean():db.data.products.find(x=>x.id===req.body.productId);if(!p||p.active===false)return res.status(404).json({error:'Product not available.'});const order=await save('Order',{userId:req.session.user.id,userEmail:req.session.user.email,productId:String(p.id||p._id),productName:p.name,amount:Number(p.price),status:'Pending payment verification',paymentRef:String(req.body.paymentRef||'').slice(0,100)});res.json({order,message:'Order created. Admin will verify payment and update delivery status.'});}catch(e){res.status(500).json({error:'Could not place order.'});}});
app.get('/api/my-orders',auth,async(req,res)=>{const orders=await all('Order',mongoMode?{userId:req.session.user.id}:{});res.json(orders.filter(o=>o.userId===req.session.user.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)));});
app.get('/api/admin/overview',admin,async(req,res)=>{const [users,products,orders]=await Promise.all([all('User'),all('Product'),all('Order')]);res.json({users:users.length,products:products.length,orders:orders.length,revenue:orders.filter(o=>o.status==='Delivered').reduce((s,o)=>s+Number(o.amount||0),0),orders:orders.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))});});
app.post('/api/admin/products',admin,async(req,res)=>{const {name,category,price,description,image,deliveryText}=req.body||{};if(!name||!Number.isFinite(Number(price))||Number(price)<0)return res.status(400).json({error:'Product name and valid price required.'});const p=await save('Product',{name,category:category||'GENERAL',price:Number(price),description:description||'',image:image||'',deliveryText:deliveryText||'Contact admin for delivery.',active:true});res.json(p);});
app.patch('/api/admin/products/:id',admin,async(req,res)=>{const p=await update('Product',req.params.id,req.body);if(!p)return res.status(404).json({error:'Not found'});res.json(p);});
app.delete('/api/admin/products/:id',admin,async(req,res)=>{const p=await update('Product',req.params.id,{active:false});if(!p)return res.status(404).json({error:'Not found'});res.json({ok:true});});
app.patch('/api/admin/orders/:id',admin,async(req,res)=>{const allowed=['Pending payment verification','Paid','Processing','Delivered','Cancelled'];if(!allowed.includes(req.body.status))return res.status(400).json({error:'Invalid status'});const o=await update('Order',req.params.id,{status:req.body.status,adminNote:String(req.body.adminNote||'').slice(0,500)});if(!o)return res.status(404).json({error:'Order not found'});res.json(o);});
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
init().then(()=>app.listen(PORT,()=>console.log(`TAMIL VIP running on ${PORT}`))).catch(e=>{console.error(e);process.exit(1);});
