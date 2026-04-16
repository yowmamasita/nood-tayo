# Nood Tayo

Philippine live TV streaming site. 103 channels, no sign-up, no ads.

**https://nood-tayo.vercel.app**

## Channels

| Category | Count | Examples |
|----------|-------|---------|
| Sports | 9 | NBA TV Philippines, One Sports HD, PBA Rush, SPOTV |
| Movies | 22 | Cinema One, HBO HD/Hits/Family/Signature, Cinemax, Viva Cinema |
| Local | 11 | TV5 HD, GMA Pinoy TV, Kapamilya Channel, A2Z, GTV, PTV 4 |
| News | 13 | GMA News TV, ANC, CNN HD, Al Jazeera, BBC, Bloomberg, CNBC |
| Kids | 7 | Cartoon Network, Animax, Nickelodeon, DreamWorks, Nick Jr |
| Entertainment | 31 | AXN, Warner TV, National Geographic, Animal Planet, NHK World |
| Lifestyle | 10 | Discovery, History, TLC, Food Network, HGTV, Fashion TV |

## Tech

- **Shaka Player** for DASH streams with ClearKey DRM
- **HLS.js** for m3u8 streams
- Static site — HTML, CSS, JS, no framework, no build step
- Mobile-first responsive layout

## Deploy

Drop the files on any static host. Or:

```
npx vercel --prod
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `k` | Next / previous channel |
| `f` | Fullscreen |
| `Space` | Play / pause |
| `m` | Mute |
| `/` | Focus search |
| `Esc` | Clear search |
