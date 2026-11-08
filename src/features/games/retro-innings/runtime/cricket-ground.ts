/** Reconstructed world scenery informed by native source frames 011/012/018.
 * Palette values are sampled from saved reference pixels. Placement is authored.
 * Rope radius matches the preserved simulation; stadium pixels never alter rules.
 */
export class CricketGround {
  private surface = document.createElement('canvas');
  constructor() {
    this.surface.width = this.surface.height = 960;
    const c = this.surface.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    // Source has broad checked outfield and narrower parallel mowing beside the strip.
    const green = ['#738c42', '#637b31', '#739439', '#6b8431'];
    for (let y = 0; y < 960; y += 24) for (let x = 0; x < 960; x += 24) {
      c.fillStyle = green[(Math.floor(x / 24) % 2) + (Math.floor(y / 24) % 2) * 2];
      c.fillRect(x, y, 24, 24);
    }
    for (let x = 333; x < 530; x += 10) {
      c.fillStyle = green[Math.floor((x - 333) / 10) % 2];
      c.fillRect(x, 329, 10, 162);
    }
    // Sparse deterministic source-like turf flecks; no screen-space noise overlay.
    for (let y = 0; y < 960; y += 3) for (let x = 0; x < 960; x += 3) {
      const n = ((x * 73856093) ^ (y * 19349663)) >>> 0;
      if (n % 17 === 0) { c.fillStyle = '#5a8c31'; c.fillRect(x, y, 1, 1); }
    }
    // Boundary gallery sits outside the legal field, leaving all ball paths visible.
    const centre = { x: 430, y: 420 }, radius = 240;
    const pixels = c.getImageData(0, 0, 960, 960);
    const crowd = [[82,57,41],[181,165,132],[214,206,181],[107,90,66],[231,222,198],[49,49,49]];
    for (let y = 100; y <= 740; y++) for (let x = 110; x <= 750; x++) {
      const dx = x - centre.x, dy = y - centre.y, distance = Math.hypot(dx, dy);
      if (distance < radius + 12 || distance > radius + 56) continue;
      const row = Math.floor((distance - radius - 12) / 5);
      const angle = Math.atan2(dy, dx), aisle = Math.abs(Math.sin(angle * 12)) < .025;
      const n = ((Math.floor(x / 2) * 31) ^ (Math.floor(y / 2) * 17)) >>> 0;
      const rgb = aisle ? [181,181,173] : distance > radius + 48
        ? ((x + y) % 6 < 2 ? [181,33,16] : [107,24,16])
        : Math.floor(distance) % 5 === 0 ? [82,74,57] : crowd[(n + row) % crowd.length];
      const i = (y * 960 + x) * 4;
      pixels.data[i] = rgb[0]; pixels.data[i + 1] = rgb[1]; pixels.data[i + 2] = rgb[2];
    }
    c.putImageData(pixels, 0, 0);
    // White picket fence follows the same perspective/curve as the boundary.
    c.strokeStyle = '#deded2'; c.lineWidth = 1;
    for (const r of [240, 250, 254]) { c.beginPath(); c.arc(430, 420, r, 0, Math.PI * 2); c.stroke(); }
    for (let t = 0; t < Math.PI * 2; t += .018) {
      const x = Math.round(430 + Math.cos(t) * 252), y = Math.round(420 + Math.sin(t) * 252);
      c.fillStyle = '#f0eee0'; c.fillRect(x, y - 2, 1, 5);
    }
    // Sight screens and a roofed pavilion are stadium architecture, not a pasted
    // screenshot. They remain outside the rope and appear only as the camera pans.
    for (const y of [152, 675]) {
      c.fillStyle = '#7b7b73'; c.fillRect(398, y, 66, 19);
      c.fillStyle = '#efefe7'; c.fillRect(400, y + 1, 62, 15);
      for (let x = 401; x < 460; x += 3) { c.fillStyle = '#b5b5ad'; c.fillRect(x, y + 2, 1, 13); }
    }
    c.fillStyle = '#b5a58c'; c.fillRect(386, 110, 94, 22);
    c.fillStyle = '#7b2118'; c.beginPath(); c.moveTo(377, 110); c.lineTo(396, 96); c.lineTo(470, 96); c.lineTo(488, 110); c.closePath(); c.fill();
    for (let x = 392; x < 477; x += 12) { c.fillStyle = '#393d39'; c.fillRect(x, 115, 6, 13); c.fillStyle = '#efe7ce'; c.fillRect(x - 2, 112, 2, 19); }
  }

  paint(c: CanvasRenderingContext2D, camera: { x: number; y: number }, pitch: HTMLImageElement) {
    const x = Math.round(camera.x), y = Math.round(camera.y);
    c.clearRect(0, 0, 256, 224);
    c.drawImage(this.surface, x, y, 256, 224, 0, 0, 256, 224);
    // Reference frame 011: the 62px-wide strip begins just above the far
    // wicket and ends just below the near crease. These are visual bounds;
    // authoritative wicket, bounce and bat-contact coordinates stay put.
    c.fillStyle = c.createPattern(pitch, 'repeat')!;
    c.save(); c.translate(399 - x, 340 - y); c.fillRect(0, 0, 62, 140); c.restore();
    // Worn footmarks remain behind athletes and do not act as collision targets.
    c.fillStyle = '#8c9452';
    for (const end of [350, 475]) for (let n = 0; n < 12; n++) {
      c.fillRect(414 + (n * 7 % 30) - x, end + (n * 3 % 9) - 5 - y, n % 3 + 1, 1);
    }
  }
}
