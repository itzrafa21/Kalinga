@php
    $activeNav = $activeNav ?? '';
    if ($activeNav === '') {
        if (request()->is('organization/dashboard')) {
            $activeNav = 'dashboard';
        } elseif (request()->is('missions/history')) {
            $activeNav = 'history';
        } elseif (request()->is('organization/volunteers')) {
            $activeNav = 'volunteers';
        } elseif (request()->is('donation')) {
            $activeNav = 'donation';
        } elseif (request()->is('organization/profile')) {
            $activeNav = 'profile';
        } elseif (request()->is('settings')) {
            $activeNav = 'settings';
        } elseif (request()->is('missions/create', 'missions/edit', 'missions/details')) {
            $activeNav = 'missions';
        }
    }
    $isActive = fn (string $key) => $activeNav === $key ? 'active' : '';
@endphp
<aside class="org-sidebar sidebar" id="sidebar" aria-label="Organization navigation">
  <div class="org-sidebar-logo sidebar-logo">
    <a href="/organization/dashboard" class="org-sidebar-logo-link">
      @include('partials.kalinga-logo', ['size' => 42, 'class' => 'org-sidebar-logo-img'])
      <span>KALINGA</span>
    </a>
  </div>

  <nav class="org-sidebar-nav sidebar-nav">
    <div class="org-sidebar-section sidebar-section">Main</div>
    <a href="/organization/dashboard" class="{{ $isActive('dashboard') }}"><i class="bi bi-grid-1x2"></i> Mission Management</a>
    <a href="/missions/history" class="{{ $isActive('history') }}"><i class="bi bi-journal-text"></i> History of Missions</a>
    <a href="/organization/volunteers" class="{{ $isActive('volunteers') }}"><i class="bi bi-people"></i> Volunteers</a>
    <a href="/donation" class="{{ $isActive('donation') }}"><i class="bi bi-heart"></i> Donation</a>

    <div class="org-sidebar-section sidebar-section">Settings</div>
    <a href="/settings" class="{{ $isActive('settings') }}"><i class="bi bi-gear"></i> Settings</a>

    <div class="org-sidebar-section sidebar-section">Account</div>
    <a href="/organization/profile" class="{{ $isActive('profile') }}"><i class="bi bi-person"></i> Profile</a>
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
