@php
    $pageTitle = $pageTitle ?? 'Dashboard';
@endphp
<header class="org-topbar" role="banner">
  <p class="org-topbar-title">{{ $pageTitle }}</p>
  <label class="org-topbar-theme" title="Dark mode">
    <i class="bi bi-moon-stars" aria-hidden="true"></i>
    <span class="org-topbar-theme-label">Dark mode</span>
    <span class="org-theme-switch">
      <input type="checkbox" id="orgDarkModeToggle" aria-label="Toggle dark mode">
      <span class="org-theme-switch-slider" aria-hidden="true"></span>
    </span>
  </label>
</header>
