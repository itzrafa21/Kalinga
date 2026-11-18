@php
    $pageTitle = $pageTitle ?? 'Dashboard';
    $titleId = $titleId ?? null;
    $titleHref = $titleHref ?? null;
@endphp
<header class="org-topbar admin-topbar" role="banner">
  @if ($titleHref)
    <a
      class="org-topbar-title"
      @if ($titleId) id="{{ $titleId }}" @endif
      href="{{ $titleHref }}"
    >{{ $pageTitle }}</a>
  @elseif ($titleId)
    <p class="org-topbar-title" id="{{ $titleId }}">{{ $pageTitle }}</p>
  @else
    <p class="org-topbar-title">{{ $pageTitle }}</p>
  @endif
  <div class="admin-topbar-end">
    @isset($topbarActions)
      {!! $topbarActions !!}
    @endisset
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
  </div>
</header>
