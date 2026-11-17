@php
    $pageTitle = $pageTitle ?? 'Dashboard';
@endphp
<header class="org-topbar" role="banner">
  <p class="org-topbar-title">{{ $pageTitle }}</p>
  <button
    type="button"
    class="org-topbar-theme-btn"
    id="orgThemeToggleBtn"
    aria-label="Switch to dark mode"
    title="Switch to dark mode"
  >
    <i class="bi bi-moon-stars-fill org-theme-icon-moon" aria-hidden="true"></i>
    <i class="bi bi-sun-fill org-theme-icon-sun" aria-hidden="true" hidden></i>
  </button>
</header>
