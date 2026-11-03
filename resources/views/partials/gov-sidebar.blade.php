@php
    $activeNav = $activeNav ?? '';
    if ($activeNav === '') {
        if (request()->is('government/dashboard')) {
            $activeNav = 'dashboard';
        }
    }
    $isActive = fn (string $key) => $activeNav === $key ? 'active' : '';
@endphp
<aside class="org-sidebar sidebar" id="sidebar" aria-label="Government office navigation">
  <div class="org-sidebar-logo sidebar-logo">
    <a href="/government/dashboard" class="org-sidebar-logo-link" aria-label="Kalinga — government dashboard">
      @include('partials.sidebar-logo-mark')
    </a>
  </div>

  <nav class="org-sidebar-nav sidebar-nav">
    <div class="org-sidebar-section sidebar-section">Main</div>
    <a href="/government/dashboard" class="{{ $isActive('dashboard') }}"><i class="bi bi-inbox"></i> Request Letters</a>

    <div class="org-sidebar-section sidebar-section">Account</div>
    <button type="button" id="logoutBtn" class="org-sidebar-logout-link sidebar-logout-link">
      <i class="bi bi-box-arrow-right"></i> Logout
    </button>
  </nav>
</aside>

<div id="orgLogoutModal" class="org-logout-modal-overlay" hidden role="dialog" aria-modal="true" aria-labelledby="orgLogoutModalTitle">
  <div class="org-logout-modal" role="document">
    <h2 id="orgLogoutModalTitle">Log out</h2>
    <p class="org-logout-modal-message">Are you sure you want to log out?</p>
    <div class="org-logout-modal-actions">
      <button type="button" class="org-logout-modal-cancel" id="orgLogoutCancel">Cancel</button>
      <button type="button" class="org-logout-modal-confirm" id="orgLogoutConfirm">Log out</button>
    </div>
  </div>
</div>
