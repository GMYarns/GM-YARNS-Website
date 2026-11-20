import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { MessageCircle, Phone, Plus, Pencil, Trash2, Eye, EyeOff, LogOut, Package, X, Upload, RefreshCw, LockKeyhole } from 'lucide-react';
import './style.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const whatsapp = (import.meta.env.VITE_WHATSAPP_NUMBER || '919489973418').replace(/\D/g, '');
const OWNER_UID = '047af1f5-8dd6-483a-b2fb-c9950a796b47';
const YARN_TYPES = ['Cotton', 'Cotton linen', 'Viscose', 'Polyester', 'Poly cotton'];
const normalizeYarnType = (value) => {
  const v = (value || '').trim().toLowerCase();
  if (v === 'cotton yarn' || v === 'cotton') return 'Cotton';
  return YARN_TYPES.find(x => x.toLowerCase() === v) || value || 'Cotton';
};
const db = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const money = (v) => v === null || v === undefined || v === '' ? 'Price on Request' : `₹${Number(v).toLocaleString('en-IN')} / KG`;

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [draft, setDraft] = useState(emptyDraft());
  const [photo, setPhoto] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const [customerYarnFilter, setCustomerYarnFilter] = useState('All');
  const [imagePreview, setImagePreview] = useState(null);

  function emptyDraft(){ return {name:'', yarn_type:'Cotton Yarn', yarn_count:'', price_per_kg:'', stock_kg:'', image_url:'', is_active:true}; }
  async function loadProducts(){
    if (!db) { setError('Supabase settings are not configured yet.'); setLoading(false); return; }
    setLoading(true); setError('');
    let query = db.from('products').select('*').order('name');
    if (!(session && admin)) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) setError(error.message); else setProducts(data || []);
    setLoading(false);
  }
  useEffect(() => {
    if (!db) { setLoading(false); setError('Supabase settings are not configured yet.'); return; }
    db.auth.getSession().then(({data}) => { setSession(data.session); setAdmin(data.session?.user?.id === OWNER_UID); });
    const {data:{subscription}} = db.auth.onAuthStateChange((_event, s) => { setSession(s); setAdmin(s?.user?.id === OWNER_UID); });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => { loadProducts(); }, [session, admin]);
  const visibleProducts = useMemo(() => products.filter(p => (admin && showHidden ? true : p.is_active !== false) && (admin || customerYarnFilter === 'All' || normalizeYarnType(p.yarn_type) === customerYarnFilter)), [products, admin, showHidden, customerYarnFilter]);
  const waLink = (p) => `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Vanakkam GM YARNS, I am interested in ${p.name}${p.yarn_count ? ` (${p.yarn_count})` : ''}. Please share details.`)}`;

  async function signIn(e){ e.preventDefault(); setLoginError(''); const {error} = await db.auth.signInWithPassword({email, password}); if(error) setLoginError(error.message); else {setLoginOpen(false);setPassword('');} }
  async function signOut(){ await db.auth.signOut(); setAdmin(false); setShowHidden(false); }
  function startAdd(){ setEditing('new'); setDraft(emptyDraft()); setPhoto(null); }
  function startEdit(p){ setEditing(p.id); setDraft({name:p.name||'',yarn_type:normalizeYarnType(p.yarn_type),yarn_count:p.yarn_count||'',price_per_kg:p.price_per_kg??'',stock_kg:p.stock_kg??'',image_url:p.image_url||'',is_active:p.is_active!==false}); setPhoto(null); }
  async function saveProduct(e){
    e.preventDefault(); setSaving(true); setError('');
    try {
      let image_url = draft.image_url || null;
      if(photo){
        const ext = photo.name.split('.').pop() || 'jpg'; const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const {error:uploadError} = await db.storage.from('product-images').upload(path, photo, {upsert:false});
        if(uploadError) throw uploadError;
        image_url = db.storage.from('product-images').getPublicUrl(path).data.publicUrl;
      }
      const payload = {name:draft.name.trim(), yarn_type:draft.yarn_type.trim(), yarn_count:draft.yarn_count.trim(), price_per_kg:draft.price_per_kg===''?null:Number(draft.price_per_kg), stock_kg:draft.stock_kg===''?null:Number(draft.stock_kg), image_url, is_active:draft.is_active};
      const result = editing === 'new' ? await db.from('products').insert(payload) : await db.from('products').update(payload).eq('id', editing);
      if(result.error) throw result.error;
      setEditing(null); await loadProducts();
    } catch(err){ setError(err.message || 'Could not save product'); }
    setSaving(false);
  }
  async function removeProduct(p){ if(!confirm(`Delete ${p.name}? This cannot be undone.`)) return; const {error}=await db.from('products').delete().eq('id',p.id); if(error) setError(error.message); else loadProducts(); }
  async function toggleActive(p){ const {error}=await db.from('products').update({is_active:p.is_active===false}).eq('id',p.id); if(error) setError(error.message); else loadProducts(); }

  return <>
    <header className="topbar"><div className="brand"><img src="/logo.png" alt="GM YARNS"/><span>GM YARNS</span></div><div className="top-actions">{session && admin ? <><button className="btn light" onClick={()=>setAdmin(!admin)}>{admin?'View Catalogue':'Admin Panel'}</button><button className="icon-btn" title="Sign out" onClick={signOut}><LogOut size={18}/></button></> : !session ? <button className="btn light" onClick={()=>setLoginOpen(true)}><LockKeyhole size={15}/> Owner Login</button> : <button className="btn light" onClick={signOut}>Sign out</button>}</div></header>
    <main className="container">
      <section className="intro"><div><p className="eyebrow">QUALITY YARNS • CUSTOMER ENQUIRIES</p><h1>{admin?'Product Management':'Our Yarn Catalogue'}</h1><p className="sub">{admin?'Add, update, hide or remove products whenever you need.':'Explore our available yarn products and contact us for details.'}</p></div>{admin && <button className="btn primary" onClick={startAdd}><Plus size={17}/> Add Product</button>}</section>
      {admin ? <div className="admin-tools"><label className="check"><input type="checkbox" checked={showHidden} onChange={e=>setShowHidden(e.target.checked)}/> Show hidden products</label><button className="btn light" onClick={loadProducts}><RefreshCw size={15}/> Refresh</button></div> : <div className="catalogue-filter"><label htmlFor="customer-yarn-filter">Filter by yarn type</label><select id="customer-yarn-filter" value={customerYarnFilter} onChange={e=>setCustomerYarnFilter(e.target.value)}><option value="All">All yarn types</option>{YARN_TYPES.map(type=><option key={type} value={type}>{type}</option>)}</select></div>}
      {error && <div className="notice error">{error}</div>}
      {!db && <div className="notice">Website setup is in progress. Supabase connection details will be added before publishing.</div>}
      {loading ? <div className="loading">Loading products…</div> : visibleProducts.length===0 ? <div className="empty"><Package size={34}/><h3>No products to show yet</h3><p>Products added through the owner panel will appear here.</p></div> : <div className="grid">{visibleProducts.map(p=><article className="product" key={p.id}>
        <div className="product-image">{p.image_url?<button type="button" className="image-open" onClick={()=>setImagePreview({url:p.image_url,name:p.name})} aria-label={`View ${p.name} photo larger`}><img src={p.image_url} alt={p.name}/><span className="zoom-hint">Tap to enlarge</span></button>:<div className="placeholder"><Package size={42}/><span>Product Photo</span></div>}{admin && p.is_active===false && <span className="hidden-tag">Hidden</span>}</div>
        <div className="product-body"><div className="product-title"><h2>{p.name}</h2></div><div className="product-details"><p><strong>Yarn type:</strong><span>{normalizeYarnType(p.yarn_type)}</span></p><p><strong>Count:</strong><span>{p.yarn_count || '—'}</span></p><p><strong>Price:</strong><span>{money(p.price_per_kg)}</span></p><p><strong>Quantity:</strong><span>{p.stock_kg!==null && p.stock_kg!=='' ? `${p.stock_kg} KG` : '—'}</span></p></div>
        {!admin ? <a className="btn whatsapp" href={waLink(p)} target="_blank" rel="noreferrer"><MessageCircle size={17}/> Enquire on WhatsApp</a> : <div className="manage"><button className="btn light" onClick={()=>startEdit(p)}><Pencil size={15}/> Edit</button><button className="btn light" onClick={()=>toggleActive(p)}>{p.is_active===false?<><Eye size={15}/> Show</>:<><EyeOff size={15}/> Hide</>}</button><button className="icon-btn danger" onClick={()=>removeProduct(p)} title="Delete"><Trash2 size={17}/></button></div>}</div>
      </article>)}</div>}
    </main>
    <footer><div className="footer-brand">GM YARNS</div><p>For product details and enquiries</p><a href={`tel:+${whatsapp}`}><Phone size={16}/> +91 94899 73418</a><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle size={16}/> WhatsApp Us</a><small>© {new Date().getFullYear()} GM YARNS</small></footer>
    {imagePreview && <div className="image-lightbox" onClick={()=>setImagePreview(null)} role="presentation"><button type="button" className="image-close" onClick={()=>setImagePreview(null)} aria-label="Close image"><X size={24}/></button><div className="image-lightbox-content" onClick={e=>e.stopPropagation()}><img src={imagePreview.url} alt={imagePreview.name}/><p>{imagePreview.name}</p></div></div>}
    {loginOpen && <div className="overlay" onClick={()=>setLoginOpen(false)}><form className="dialog small" onSubmit={signIn} onClick={e=>e.stopPropagation()}><button type="button" className="close" onClick={()=>setLoginOpen(false)}><X/></button><h2>Owner Login</h2><p>Sign in to manage the product catalogue.</p><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{loginError&&<p className="form-error">{loginError}</p>}<button className="btn primary full">Login</button></form></div>}
    {editing!==null && <div className="overlay" onClick={()=>setEditing(null)}><form className="dialog" onSubmit={saveProduct} onClick={e=>e.stopPropagation()}><button type="button" className="close" onClick={()=>setEditing(null)}><X/></button><h2>{editing==='new'?'Add Product':'Update Product'}</h2><div className="form-grid"><label>Product name *<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} required/></label><label>Yarn type *<select value={normalizeYarnType(draft.yarn_type)} onChange={e=>setDraft({...draft,yarn_type:e.target.value})} required>{YARN_TYPES.map(type=><option key={type} value={type}>{type}</option>)}</select></label><label>Yarn count / specification<input value={draft.yarn_count} onChange={e=>setDraft({...draft,yarn_count:e.target.value})}/></label><label>Price per KG (leave blank for Price on Request)<input type="number" min="0" step="0.01" value={draft.price_per_kg} onChange={e=>setDraft({...draft,price_per_kg:e.target.value})}/></label><label>Stock in KG (optional)<input type="number" min="0" step="0.01" value={draft.stock_kg} onChange={e=>setDraft({...draft,stock_kg:e.target.value})}/></label><label className="file-label">Product photo<input type="file" accept="image/*" onChange={e=>setPhoto(e.target.files?.[0]||null)}/><span><Upload size={15}/> {photo?photo.name:'Choose photo'}</span></label></div><label className="check active-check"><input type="checkbox" checked={draft.is_active} onChange={e=>setDraft({...draft,is_active:e.target.checked})}/> Visible in public catalogue</label><button className="btn primary full" disabled={saving}>{saving?'Saving…':'Save Product'}</button></form></div>}
  </>;
}

createRoot(document.getElementById('root')).render(<App/>);
