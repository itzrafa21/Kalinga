<style>
  * { box-sizing: border-box; }
  body.org-app {
    font-family: 'Poppins', Arial, sans-serif;
    margin: 0;
    background: #f0f2f5;
    color: #333;
  }
  .org-sidebar {
    width: 260px;
    background: #ffffff;
    height: 100vh;
    position: fixed;
    left: 0;
    top: 0;
    padding: 1.25rem 0 1rem;
    z-index: 200;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.12);
  }
  .org-sidebar-logo {
    padding: 0 1rem 1rem 1.25rem;
    border-bottom: 1px solid rgba(31, 31, 31, 0.08);
    margin-bottom: 1rem;
  }
  .org-sidebar-logo span {
    font-weight: 700;
    font-size: 1.05rem;
    letter-spacing: 0.12em;
    color: #000000;
  }
  .org-sidebar-nav {
    padding: 0 0.75rem;
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 2px;
  }
  .org-sidebar-section {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.55px;
    color: #000000;
    padding: 1rem 0.75rem 0.45rem;
  }
  .org-sidebar a {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    color: #000000;
    text-decoration: none;
    padding: 10px 14px;
    border-radius: 10px;
    font-weight: 500;
    font-size: 0.92rem;
    transition: background 0.2s, color 0.2s;
  }
  .org-sidebar a:hover {
    background: rgba(0, 0, 0, 0.04);
    color: #000000;
  }
  .org-sidebar a.active {
    background: #28a745;
    color: #000000;
    box-shadow: 0 2px 8px rgba(40, 167, 69, 0.35);
  }
  .org-sidebar a i {
    font-size: 1.05rem;
    width: 22px;
    text-align: center;
    color: #000000;
  }
  #logoutBtn.org-sidebar-logout-link {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin-top: 2px;
    padding: 10px 14px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: #000000;
    font-weight: 500;
    font-size: 0.92rem;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: background 0.2s;
  }
  #logoutBtn.org-sidebar-logout-link:hover { background: rgba(0, 0, 0, 0.04); }
  #logoutBtn.org-sidebar-logout-link i {
    font-size: 1.05rem;
    width: 22px;
    text-align: center;
  }
  .org-main-content {
    margin-left: 260px;
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
