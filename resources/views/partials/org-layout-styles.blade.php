@include('partials.org-theme-boot')
<style>
  * { box-sizing: border-box; }
  body.org-app {
    font-family: 'Poppins', Arial, sans-serif;
    margin: 0;
    background: #f0f2f5;
    color: #333;
  }
  .org-sidebar {
    width: 210px;
    min-width: 210px;
    background: #ffffff;
    height: 100vh;
    position: fixed;
    left: 0;
    top: 0;
    padding: 0;
    z-index: 200;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #eaecef;
    box-shadow: none;
  }
  .org-sidebar-logo {
    padding: 20px 16px 16px;
    border-bottom: 1px solid #f0f2f5;
    margin-bottom: 0;
  }
  .org-sidebar-logo-link {
    display: block;
    text-decoration: none;
    color: inherit;
  }
  @include('partials.sidebar-logo-mark-styles')
  .org-sidebar-nav {
    padding: 12px 10px;
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 0;
    overflow-y: auto;
  }
  .org-sidebar-section {
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #c8c8c8;
    padding: 10px 8px 5px;
  }
  .org-sidebar a {
    display: flex;
    align-items: center;
    gap: 9px;
    color: #666;
    text-decoration: none;
    padding: 9px 11px;
    border-radius: 8px;
    font-weight: 500;
    font-size: 13px;
    margin-bottom: 2px;
    transition: background 0.12s, color 0.12s;
  }
  .org-sidebar a:hover {
    background: #f4f5f7;
    color: #222;
  }
  .org-sidebar a.active {
    background: #aaf0ba;
    color: #000000;
  }
  .org-sidebar a i {
    font-size: 17px;
    width: auto;
    text-align: center;
    color: inherit;
  }
  #logoutBtn.org-sidebar-logout-link {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-top: 2px;
    margin-bottom: 2px;
    padding: 9px 11px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #666;
    font-weight: 500;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: background 0.12s, color 0.12s;
  }
  #logoutBtn.org-sidebar-logout-link:hover {
    background: #f4f5f7;
    color: #222;
  }
  #logoutBtn.org-sidebar-logout-link i {
    font-size: 17px;
    width: auto;
    text-align: center;
  }
  .org-main-content {
    margin-left: 210px;
    padding: 1.5rem 2rem 2rem;
    min-height: 100vh;
    background:#effff4;
    color: #1f2937;
  }
  @media (max-width: 768px) {
    .org-sidebar {
      transform: translateX(-100%);
      transition: transform 0.25s ease;
    }
    .org-sidebar.open { transform: translateX(0); }
    .org-main-content { margin-left: 0; }
  }
  .org-logout-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 36, 25, 0.55);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 4000;
    padding: 1rem;
  }
  .org-logout-modal-overlay.is-open { display: flex; }
  .org-logout-modal-overlay[hidden] { display: none !important; }
  .org-logout-modal {
    background: #fff;
    border-radius: 14px;
    max-width: 400px;
    width: 100%;
    padding: 1.35rem 1.5rem 1.25rem;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
  }
  .org-logout-modal h2 {
    margin: 0 0 0.5rem;
    font-size: 1.15rem;
    color: #111827;
  }
  .org-logout-modal-message {
    margin: 0 0 1.25rem;
    font-size: 0.92rem;
    color: #64748b;
    line-height: 1.45;
  }
  .org-logout-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.65rem;
  }
  .org-logout-modal-cancel,
  .org-logout-modal-confirm {
    border: none;
    border-radius: 10px;
    padding: 0.55rem 1rem;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  }
  .org-logout-modal-cancel {
    background: #f1f5f9;
    color: #334155;
  }
  .org-logout-modal-cancel:hover { background: #e2e8f0; }
  .org-logout-modal-confirm {
    background: #dc2626;
    color: #fff;
  }
  .org-logout-modal-confirm:hover { background: #b91c1c; }
  .org-logout-modal-confirm:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
</style>
