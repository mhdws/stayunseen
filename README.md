# Stay Unseen — website

Product page for the extension, built into this folder so it can be uploaded as-is.
Static: no build step, no dependencies, no server-side anything.

```
web/
  index.html      the product page
  privacy.html    the privacy policy, same shell
  styles.css      one stylesheet for both pages
  script.js       accent switch, reveals, card tilt, canvas field, gallery tabs
  assets/         popup screenshots, the store screenshots, the extension icon
  downloads/      the three packaged builds, kept as an unpacked-install fallback
```

Deploy by copying the folder to a static host. Every path in the HTML is relative, so
it works from a subdirectory (`/stay-unseen/`) as well as from a domain root.

`site/` is a separate, earlier attempt by another tool and is not used by anything here.

## Design

Ported from the `mheadowshtml.html` personal-space template: the same single-hue colour
system, canvas particle and wireframe field, perspective grid, floating orbs, tilting 3D
card stage with HUD and scan-line treatment, and `IntersectionObserver` reveals.

The one hue in `--ps-h` derives every colour on the page. All three values it can take are
read off the extension icon: it defaults to **226** (the periwinkle of the icon's frame and
ghost) and the header switch moves it to 209 (the steel of the badge circle) or 253 (the
purple half of the shield), remembered in `localStorage`. Changing the default means
changing that one number in `styles.css` and the matching `data-ps-theme` attribute in the
HTML.

The page's accent is that hue at full saturation, which is more vivid than the popup's own
`#9cafec` — the popup accent has to clear 4.5:1 on its panels, the page accent only has to
glow on near-black. Same family, different job.

## The screenshots

`assets/popup-*.png` are real captures of the extension's own popup — its unmodified
`popup/popup.html`, `popup.css` and `popup.js` — not mockups. Regenerate them with:

```bash
python3 tools/capture-popup.py
```

That script renders the popup in headless Firefox behind a stubbed `chrome.storage.local`,
once per UI state, at 2× device pixel ratio and the popup's real 372 px width. It seeds the
stored counters and log rows so the states are reproducible, spoofs a Chrome user agent
(so the status row reads `active (DNR)`, matching the Chrome build) and anchors the clock
so log timestamps do not change between runs. Its docstring covers the details.

Six states, matching the gallery tabs: `popup-main`, `popup-per-feature`, `popup-paused`,
`popup-status`, `popup-diagnostics`, `popup-main-light`.

The gallery shows each capture at its full height inside a 372 px frame that scrolls, so
nothing is cropped. If a regenerated capture changes height, update the `height` attribute
on its `<img>` in `index.html` (CSS px = image height ÷ 2) so the page does not reflow while
images load.

`assets/shot-*-1280x800.jpg` are the store listing screenshots, copied from
`store/screenshots/output/` and shown in the "How it works" section. They replaced the
old `whatitdoes.jpeg` illustration. Regenerate them in `store/screenshots/`, then:

```bash
for n in 01-overview 02-controls 03-how-it-works; do
  cp "store/screenshots/output/$n-1280x800.jpg" \
     "web/assets/shot-${n#??-}-1280x800.jpg"
done
```

## The store links

The primary buttons in the hero and the Install section point at the three store
listings. Two of them still carry placeholder IDs that must be replaced once each
submission is approved:

| Browser | Link in `index.html` | Needs |
| --- | --- | --- |
| Chrome | `chromewebstore.google.com/detail/stay-unseen/CHROME_EXTENSION_ID` | the 32-char item ID |
| Edge | `microsoftedge.microsoft.com/addons/detail/EDGE_EXTENSION_ID` | the item ID from Partner Center |
| Firefox | `addons.mozilla.org/firefox/addon/stay-unseen/` | confirm the slug AMO assigns |

Each appears twice — once in the hero `ps-action-grid`, once in `ps-install-grid` — so
replace all occurrences.

## The downloads

`downloads/` holds its own copies of the three zips rather than linking into `dist/`,
because `build.py` clears `dist/` on every run. They are no longer the primary install
path — the store links are — but the `ps-install-note` paragraph still links all three
for anyone who wants to load the extension unpacked or read the code. After cutting a
new version:

```bash
cp dist/*.zip web/downloads/
```

Then update the version string and the three zip `href`s in the `ps-install-note`, the
`ps-status-pill` text, and the footer line on both pages.

## Local preview

```bash
python3 -m http.server 8731 --directory web
```

Then open <http://localhost:8731/>. Opening `index.html` straight off disk works too;
only the `file://` origin makes the download links behave slightly differently.
