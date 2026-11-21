/**
 * Component-local stylesheet. The portal carries it, so unmounting removes it.
 *
 * The surface vocabulary is borrowed from the host primitives, not restyled to
 * taste: the compact popover is a Menu card (4px padding, translucent menu
 * material, 34px rows with a trailing check) and the expanded chooser is a
 * Modal card (l2 surface, panel radius, hairline rules, 28px buttons). Only
 * theme tokens are referenced, so both themes and future host revisions carry
 * over.
 */
export const CSS = `
/* The compact popover follows the host Menu surface and the expanded chooser
 * follows the host Modal surface. Both use host theme tokens. */
.wsp-layer { position: fixed; inset: 0; z-index: 1099; }
.wsp-popover {
  position: fixed; z-index: 1100; box-sizing: border-box;
  display: flex; flex-direction: column;
  width: 360px; max-width: calc(100vw - 24px); max-height: min(64vh, 420px);
  padding: 4px;
  border: 0;
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-specific-menu, var(--dsw-menu-surface-fill, var(--dsw-alias-bg-layer-1)));
  -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  box-shadow: var(--dsw-elevation-prominent, 0 0 0 .5px var(--dsw-alias-border-l1), 0 3px 8px rgba(0, 0, 0, .04), 0 0 20px rgba(0, 0, 0, .05));
  color: var(--dsw-alias-label-primary);
  --dsw-elevation-stroke-color: var(--dsw-alias-border-l1);
  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2);
  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2);
  overflow: hidden;
  font-family: var(--dsw-font-family, inherit);
  animation: wsp-fade 150ms ease-out;
}
.wsp-pop-head { flex: none; padding: 0; }
.wsp-pop-body {
  min-height: 0; overflow: auto; overscroll-behavior: contain;
  padding: 0;
}
.wsp-search {
  box-sizing: border-box; position: relative; display: flex; align-items: center; gap: 6px;
  margin: 2px 0 3px; padding: 5px 8px;
  border: 0; border-radius: var(--dsw-radius-md);
  background: transparent;
}
.wsp-search[data-has-value='true'] { padding-right: 34px; }
.wsp-search-icon {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 14px; height: 14px; color: var(--dsw-alias-label-tertiary);
}
.wsp-search-input {
  flex: 1; min-width: 0; padding: 0; border: 0; outline: 0;
  background: transparent; color: var(--dsw-alias-label-primary);
  font: inherit; font-size: 12px; line-height: normal;
}
.wsp-search-input::placeholder { color: var(--dsw-alias-label-caption); }
.wsp-search-input::-webkit-search-cancel-button { display: none; }
.wsp-search-clear {
  position: absolute; top: 50%; right: 4px; transform: translateY(-50%);
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; padding: 0; border: 0;
  border-radius: 999px; corner-shape: round;
  background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer;
}
@media (hover: hover) {
  .wsp-search-clear:hover { background: var(--dsw-alias-interactive-bg-hover); }
}
.wsp-search-clear:focus-visible {
  outline: none; background: var(--dsw-alias-interactive-bg-hover);
}
.wsp-section {
  display: flex; align-items: baseline; gap: 6px;
  padding: 6px 8px;
}
.wsp-section-label { font-size: 11px; line-height: 15px; color: var(--dsw-alias-label-tertiary); }
.wsp-section-count { font-size: 11px; line-height: 15px; color: var(--dsw-alias-label-tertiary); }
.wsp-list { display: flex; flex-direction: column; }
.wsp-row {
  box-sizing: border-box;
  display: flex; align-items: center; gap: 6px;
  width: 100%; min-height: 34px; padding: 6px 8px;
  border: 0; border-radius: var(--dsw-radius-md);
  background: transparent; color: var(--dsw-alias-label-primary);
  font: inherit; font-size: 13px; line-height: 20px;
  text-align: left; cursor: pointer;
}
@media (hover: hover) {
  .wsp-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
}
.wsp-row[data-active='true'], .wsp-row:focus-visible {
  background: var(--dsw-alias-interactive-bg-hover); outline: none;
}
.wsp-row[aria-disabled='true'] { opacity: .4; cursor: default; }
.wsp-row-icon {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 14px; height: 14px; color: var(--dsw-alias-menu-icon);
}
.wsp-row-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
/* Compact rows keep the Menu's single 34px line: the disambiguating path
 * suffix rides beside the title, which gives way first, instead of adding a
 * second line. It stays quiet at 11/16 so the title keeps priority. */
.wsp-row-line { display: flex; align-items: baseline; gap: 4px; min-width: 0; flex: 1; }
.wsp-row-line .wsp-row-title { flex: 0 1 auto; min-width: 0; }
.wsp-row-suffix {
  flex: none; max-width: 70%;
  font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.wsp-row-title {
  font-size: 13px; line-height: 20px;
  color: var(--dsw-alias-label-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.wsp-row-path {
  font-size: 11px; line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.wsp-row-meta {
  flex: none; display: flex; flex-direction: column; align-items: flex-end;
  max-width: 42%;
}
.wsp-row-time { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); white-space: nowrap; }
.wsp-row-count { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); white-space: nowrap; }
.wsp-row-check {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 14px; height: 14px; color: var(--dsw-alias-label-primary);
}
.wsp-foot {
  flex: none;
  display: flex; align-items: center; justify-content: space-between; gap: 4px;
  margin-top: 3px; padding-top: 3px;
  border-top: .5px solid var(--dsw-alias-border-l2);
}
.wsp-foot-action {
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 34px; padding: 6px 8px;
  border: 0; border-radius: var(--dsw-radius-md);
  background: transparent; color: var(--dsw-alias-label-primary);
  font: inherit; font-size: 13px; line-height: 20px; cursor: pointer;
}
.wsp-foot-action svg { flex: none; color: var(--dsw-alias-menu-icon); }
@media (hover: hover) {
  .wsp-foot-action:hover { background: var(--dsw-alias-interactive-bg-hover); }
}
.wsp-foot-action:focus-visible {
  background: var(--dsw-alias-interactive-bg-hover); outline: none;
}
.wsp-foot-action[aria-disabled='true'] { opacity: .4; cursor: default; }
.wsp-foot-count, .wsp-foot-note {
  padding: 0 8px; font-size: 12px; line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
.wsp-empty {
  display: flex; flex-direction: column; gap: 2px;
  padding: 8px 8px 12px;
}
.wsp-empty-title { font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); }
.wsp-empty-body { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.wsp-skeleton { display: flex; flex-direction: column; padding: 2px 0; }
.wsp-skeleton-row {
  display: flex; align-items: center; gap: 8px;
  min-height: 34px; padding: 6px 8px;
}
.wsp-skeleton-icon {
  flex: none; width: 14px; height: 14px; border-radius: var(--dsw-radius-xs);
  background: var(--dsw-alias-bg-skeleton); animation: wsp-pulse 1.4s ease-in-out infinite;
}
.wsp-skeleton-text { display: flex; flex-direction: column; gap: 5px; flex: 1; }
.wsp-skeleton-bar {
  height: 8px; border-radius: var(--dsw-radius-xs);
  background: var(--dsw-alias-bg-skeleton); animation: wsp-pulse 1.4s ease-in-out infinite;
}
.wsp-skeleton-bar-wide { width: 62%; }
.wsp-skeleton-bar-narrow { width: 38%; opacity: .7; }
.wsp-error {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 6px;
  margin: 0 0 3px; padding: 6px 7px;
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-interactive-bg-hover-danger);
  color: var(--dsw-alias-state-error-primary);
  font-size: 11px; line-height: 16px;
}
.wsp-warning {
  margin: 0 0 3px; padding: 6px 7px;
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-state-warn-label);
  font-size: 11px; line-height: 16px;
}
.wsp-sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
.wsp-error-text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.wsp-error-label { font-weight: 600; }
.wsp-error-dismiss {
  flex: none; padding: 0; border: 0; background: transparent;
  color: inherit; font: inherit; font-weight: 600; cursor: pointer;
}
.wsp-modal-layer {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  padding: max(24px, var(--dsh-frame-overlay-top, 24px)) 24px;
}
/* The mask starts below the Desktop frame chrome, as the host Modal's does;
 * a titlebar strip left un-dimmed keeps the window draggable around the card. */
.wsp-modal-layer::before {
  content: ''; position: absolute;
  inset: var(--dsh-frame-chrome-top, 0px) 0 0;
  background: var(--dsw-alias-bg-mask-1);
  -webkit-backdrop-filter: var(--dsw-mask-blur, none);
  backdrop-filter: var(--dsw-mask-blur, none);
  animation: wsp-fade var(--ds-transition-duration, .2s) var(--ds-ease-in-out, cubic-bezier(.4, 0, .2, 1));
}
.wsp-dialog {
  box-sizing: border-box; position: relative;
  display: flex; flex-direction: column;
  width: min(680px, 100%);
  height: min(520px, calc(100dvh - 48px));
  border: 0;
  border-radius: var(--dsw-radius-panel);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  box-shadow: var(--dsw-elevation-prominent);
  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2);
  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2);
  overflow: hidden;
  font-family: var(--dsw-font-family, inherit);
  animation: wsp-fade var(--ds-transition-duration, .2s) var(--ds-ease-in-out, cubic-bezier(.4, 0, .2, 1));
}
.wsp-dialog-head {
  flex: none;
  display: flex; align-items: center; gap: 4px;
  padding: 16px 14px 8px 24px;
}
.wsp-dialog-heading { flex: 1; min-width: 0; }
.wsp-dialog-title {
  margin: 0; font-size: 16px; line-height: 24px; font-weight: 500;
  color: var(--dsw-alias-label-primary);
}
.wsp-dialog-subtitle { margin: 0; font-size: 14px; line-height: 22px; color: var(--dsw-alias-label-secondary); }
.wsp-icon-btn {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; padding: 0; border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent; color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
@media (hover: hover) {
  .wsp-icon-btn:hover {
    background: var(--dsw-alias-interactive-bg-hover);
    color: var(--dsw-alias-label-primary);
  }
}
/* Optical overhang: the 14px glyph, not its 28px hitbox, lands on the 24px
 * gutter the rest of the card uses. */
.wsp-back { margin-left: -6px; }
.wsp-dialog-search {
  flex: none;
  padding: 0 24px 12px;
  border-bottom: .5px solid var(--dsw-alias-border-l3);
}
.wsp-dialog-search-tools { display: flex; align-items: center; gap: 6px; position: relative; --wsp-menu-inset: 24px; }
.wsp-dialog-search-tools > .wsp-search { flex: 1; min-width: 0; }
.wsp-navigation-toolbar { display: flex; align-items: center; gap: 4px; flex: none; }
.wsp-tool-button:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }
.wsp-tool-button[aria-expanded='true'] { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.wsp-tool-button:disabled, .wsp-tool-button[aria-disabled='true'] { opacity: .45; cursor: default; }
/* Keep the official Menu in the modal's DOM and anchor its list within the
 * dialog gutters. The Menu's own scrolling viewport contains every section. */
.wsp-view-options.wsp-view-options { position: static; }
.wsp-view-options .wsp-view-options-menu {
  inset-block-start: calc(100% - 6px); inset-inline: auto var(--wsp-menu-inset);
  min-width: min(200px, calc(100% - 2 * var(--wsp-menu-inset)));
  max-width: min(360px, calc(100% - 2 * var(--wsp-menu-inset)));
  max-height: clamp(64px, calc(100dvh - 180px), 366px);
}
.wsp-view-options-menu > [role='presentation'] { overscroll-behavior: contain; }
.wsp-view-options-label { display: block; white-space: normal; overflow-wrap: anywhere; }
.wsp-dialog-search .wsp-search {
  height: 32px; margin: 0; padding: 0 8px;
  border: .5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
}
.wsp-dialog-search .wsp-search:focus-within { border-color: var(--dsw-alias-state-business-primary); }
.wsp-dialog-search .wsp-search[data-has-value='true'] { padding-right: 34px; }
.wsp-dialog-search .wsp-search-icon { width: 16px; height: 16px; }
.wsp-dialog-search .wsp-search-input { font-size: 14px; line-height: 22px; }
.wsp-dialog-search .wsp-search-input::placeholder { color: var(--dsw-alias-label-dimmed); }
.wsp-dialog-body {
  flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain;
  padding: 0 24px 16px;
}
/* Sticky headings take the card fill so scrolling rows never show through;
 * the padding keeps the first one off the search divider. */
.wsp-dialog-body .wsp-section {
  position: sticky; top: 0; z-index: 1;
  padding: 12px 8px 6px; font-weight: 500;
  background: var(--dsw-alias-bg-layer-2);
}
.wsp-dialog-body .wsp-row { gap: 8px; }
.wsp-dialog-body .wsp-row-icon { width: 16px; height: 16px; }
.wsp-dialog-body .wsp-skeleton-icon { width: 16px; height: 16px; }
.wsp-dialog-body .wsp-empty { padding: 12px 8px; }
.wsp-dialog .wsp-error, .wsp-dialog .wsp-warning { margin: 0 24px 12px; }
.wsp-dialog-foot {
  flex: none;
  display: flex; align-items: center; gap: 8px;
  padding: 16px 24px;
  border-top: .5px solid var(--dsw-alias-border-l3);
}
.wsp-navigation-list, .wsp-tree-children { gap: 2px; }
.wsp-tree-children {
  display: grid; grid-template-columns: minmax(0, 1fr); margin-block-start: 2px;
  margin-inline-start: 8px; padding-inline-start: 3px;
  border-inline-start: 1px solid var(--dsw-alias-border-l3);
}
.wsp-dialog-body .wsp-navigation-row { min-height: 32px; padding: 0 8px; gap: 6px; text-align: start; }
.wsp-dialog-body .wsp-navigation-row[data-search-meta='true'] { min-height: 48px; padding-block: 4px; }
.wsp-navigation-row .wsp-row-title { font-size: 14px; }
.wsp-navigation-row[data-selected='true'] { background-color: var(--dsw-alias-interactive-bg-hover); }
.wsp-navigation-row[data-archived='true'] .wsp-row-title { color: var(--dsw-alias-label-secondary); }
.wsp-navigation-row[draggable='true'] { cursor: grab; }
.wsp-navigation-row[draggable='true']:active { cursor: grabbing; }
.wsp-navigation-row[data-drop-target='before'] { box-shadow: inset 0 2px var(--dsw-alias-state-business-primary); }
.wsp-navigation-row[data-drop-target='after'] { box-shadow: inset 0 -2px var(--dsw-alias-state-business-primary); }
.wsp-navigation-row:focus-visible { outline: 1px solid var(--dsw-focus-ring-color); outline-offset: -1px; }
.wsp-search-meta { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
.wsp-search-meta .wsp-row-path { font-size: 12px; line-height: 17px; }
.wsp-search-meta .wsp-row-path:first-child:not(:only-child) { max-width: 40%; }
.wsp-search-meta .wsp-session-snippet { color: var(--dsw-alias-label-secondary); }
.wsp-tree-option, .wsp-navigation-actions { display: flex; align-items: center; gap: 6px; }
.wsp-tree-option { gap: 0; }
.wsp-tree-option > .wsp-row { flex: 1; min-width: 0; }
.wsp-tree-icon { color: var(--dsw-alias-label-tertiary); }
.wsp-tree-icon[data-current='true'] { color: var(--dsw-alias-state-business-primary); }
.wsp-tree-arrow { color: var(--dsw-alias-label-caption); transition: transform 150ms var(--ds-ease-in-out, ease); }
.wsp-tree-icon > .wsp-tree-arrow { display: none; }
.wsp-tree-disclosure { margin-inline-end: 4px; }
.wsp-tree-disclosure:dir(rtl) .wsp-tree-arrow, .wsp-tree-icon:dir(rtl) > .wsp-tree-arrow { transform: rotate(180deg); }
.wsp-tree-disclosure[data-expanded='true'] .wsp-tree-arrow,
.wsp-tree-icon[data-expanded='true'] > .wsp-tree-arrow { transform: rotate(90deg); }
@media (hover: hover) {
  .wsp-navigation-row:hover .wsp-tree-icon[data-swap='true'] > .wsp-tree-folder { display: none; }
  .wsp-navigation-row:hover .wsp-tree-icon[data-swap='true'] > .wsp-tree-arrow { display: block; }
}
.wsp-menu-row { gap: 2px; }
.wsp-row-menu { flex: none; width: 24px; height: 24px; }
.wsp-row-menu > svg { width: 14px; height: 14px; }
@media (hover: hover) and (pointer: fine) {
  .wsp-menu-row:not(:hover):not(:focus-within):not([data-active='true']) > .wsp-row-menu:not([aria-expanded='true']) {
    visibility: hidden;
  }
}
.wsp-navigation-actions { min-width: 0; flex-wrap: wrap; }
@media (prefers-reduced-motion: reduce) { .wsp-tree-arrow { transition: none; } }
.wsp-dialog-count { margin-inline-start: auto; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.wsp-spinner {
  width: 12px; height: 12px; border-radius: 50%;
  border: 1.5px solid currentColor; border-right-color: transparent;
  animation: wsp-spin .7s linear infinite;
}
@keyframes wsp-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes wsp-pulse { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
@keyframes wsp-spin { to { transform: rotate(360deg); } }
@media (pointer: coarse) {
  .wsp-search-input { font-size: 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .wsp-popover, .wsp-dialog, .wsp-modal-layer::before, .wsp-skeleton-icon,
  .wsp-skeleton-bar, .wsp-spinner { animation: none; }
}
@media (max-width: 640px) {
  .wsp-popover {
    left: 12px !important; right: 12px !important;
    top: auto !important;
    bottom: max(12px, env(safe-area-inset-bottom)) !important;
    width: auto !important; max-height: min(76vh, 560px) !important;
    animation: wsp-fade 150ms ease-out;
  }
  .wsp-modal-layer { padding: 10px; padding-bottom: max(10px, env(safe-area-inset-bottom)); }
  .wsp-dialog {
    width: 100%; height: 100%;
    border-radius: var(--dsw-radius-lg);
  }
  .wsp-dialog-head { padding: 14px 12px 6px 16px; }
  .wsp-dialog-search { padding: 0 16px 10px; }
  .wsp-dialog-search-tools { --wsp-menu-inset: 16px; }
  .wsp-dialog-body { padding: 0 16px 10px; }
  .wsp-dialog .wsp-error, .wsp-dialog .wsp-warning { margin: 0 16px 10px; }
  .wsp-dialog-foot { padding: 12px 16px; }
}
`
