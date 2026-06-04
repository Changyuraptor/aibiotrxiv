(function(){
  const isLoginPage = location.pathname.startsWith('/admin/login');
  async function checkAdminSession(){
    try{
      const res = await fetch('/api/admin/session', { credentials:'include' });
      if(!res.ok) throw new Error('Not authenticated');
      const data = await res.json();
      document.querySelectorAll('[data-admin-account]').forEach(el=>{ el.textContent = data.account || 'admin'; });
      return true;
    }catch(err){
      if(!isLoginPage){
        location.href = '/admin/login/?next=' + encodeURIComponent(location.pathname + location.search);
      }
      return false;
    }
  }
  async function logout(){
    try{ await fetch('/api/admin/logout', { method:'POST', credentials:'include' }); }catch(e){}
    location.href='/admin/login/';
  }
  window.aibioAdminLogout = logout;
  if(!isLoginPage) checkAdminSession();
})();
