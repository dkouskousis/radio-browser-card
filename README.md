# Radio Browser Card

A Home Assistant dashboard card for the built-in **Radio Browser** media source. Search stations, keep favorites, and play on a selected media player, including Google Cast devices.

## Requirements

- A recent Home Assistant release with `media_source/search_media` support (the card uses the Home Assistant frontend and core APIs available in September 2026).
- [Radio Browser](https://www.home-assistant.io/integrations/radio_browser/) installed in Settings → Devices & services.
- At least one media player that supports `media_player.play_media` and Radio Browser media sources.

## Install with HACS

1. HACS → three-dot menu → **Custom repositories** → enter this repository URL → select **Dashboard**.
2. Install **Radio Browser Card**. HACS normally registers the JavaScript resource automatically; if it does not, add `/hacsfiles/radio-browser-card/radio-browser-card.js` as a **JavaScript module** under Settings → Dashboards → Resources.
3. Add a **Manual** card to your dashboard:

```yaml
type: custom:radio-browser-card
title: Radio
# Optional: only show these media players; otherwise all media_player entities are shown.
# entities:
#   - media_player.living_room_speaker
#   - media_player.kitchen_speaker
# Optional: initially select this player before a saved choice exists.
# default_player: media_player.living_room_speaker
```

Use `/hacsfiles/radio-browser-card/radio-browser-card.js` exactly as written: **no** `/local/` prefix or version query string is needed. After updating, reload the Home Assistant app/dashboard if an old resource is cached.

## How it works

- Search and Popular stations come from Home Assistant's Radio Browser media source, not a third-party API called from your browser.
- Favorites and the last selected player are stored in Home Assistant's **per-user frontend storage**. The same HA account sees the same favorites on mobile and desktop; other HA accounts have their own favorites. Open cards update when another device using the same account makes a change.
- In the Favorites tab, tap **Reorder** (↕) to show the ▲ and ▼ controls. Tap **Done** when finished. The order is saved for your HA account and works on mobile and desktop.
- The card sends `media_player.play_media` with `media-source://radio_browser/<station UUID>` and the station's media type. Radio Browser resolves the stream when you play it.
- The card remembers the last Radio Browser station started on each player and shows its name while that player is active. If the player reports a different media content ID, the remembered station is cleared.
- If the player's Home Assistant entity exposes `media_title` and/or `media_artist`, the card displays them separately as track/stream information. Some players do not expose embedded radio stream metadata to Home Assistant, even when the stream carries it; the card does not fetch raw audio stream metadata itself.
- The volume control and Stop button target the selected media player.

If a station cannot play, first try it in **Media → Radio Browser** on the same player. A directory entry can be outdated, and media players vary in the audio formats they support.

## Development

The release file is `dist/radio-browser-card.js`. It is plain JavaScript with no build step or external runtime dependencies. Run `node --check dist/radio-browser-card.js` for a syntax check.

The card's API calls have been checked with a local mock. It has not yet been run against a live Home Assistant instance.

MIT license.
