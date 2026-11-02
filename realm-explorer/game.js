(() => {
'use strict';
// ---- stage constants (logical 960x540) ----
const VW = 960, VH = 540;
const BG_H = 600;              // backgrounds are drawn a little taller than the stage, so each place scrolls
const WALK = 210, HURRY = 340, CYCLE = 120;   // px walked per full walk cycle, whatever the frame count
const SAMPLE = 3, SPACING = 108; // party trail: followers walk SPACING px behind each other along the leader's path
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Each place: `yoff` lifts the painting so its landmarks stay in frame, `ground` is where feet go,
// `scale` (default 1) sizes the party to the painting: the rooms are painted much closer up than the outdoors.
const PLACES = [
  { name: 'Castle Valley', img: 'castle-valley.jpg', yoff: -24, ground: 506, ambient: 'birds',
    spots: [[.07, 'An old oak shades the road out of the valley.'], [.42, 'Waterfalls tumble beneath the old stone bridges.'], [.86, 'The castle gate stands open today.']],
    doors: [[.07, 19, .9, 'Take the road to Azurea', 'The road under the old oak leads out of the valley, all the way to Azurea, the blue continent.'],
      [.86, 8, .8, 'Enter the castle', 'The open castle gate leads into the sage-green dove hall.']] },
  { name: 'Lavender Fields', img: 'lavender-fields.jpg', yoff: -56, ground: 492, ambient: 'butterflies',
    spots: [[.09, 'A dry-stone wall and an old fence mark the edge of the fields.'], [.37, 'Far off, a little castle sits on the lake shore.'], [.75, 'The village rooftops rise beyond the lavender. A path leads to the market square.']],
    doors: [[.82, 7, .06, 'Visit Lavender Village', 'Follow the lavender-lined path into the village market square.']] },
  { name: 'Aspen Meadow', img: 'aspen-meadow.jpg', yoff: -36, ground: 500, ambient: 'leaves',
    spots: [[.1, 'White aspens whisper in the breeze.'], [.52, 'A mountain lake glitters between the pines.']],
    doors: [[.3, 'picnic', null, 'Spread a picnic', 'A sunny clearing among the aspens, just right for a picnic blanket.'],
      [.73, 3, .51, 'Climb into the treehouse', 'A treehouse with a spiral stair winds up the great tree.']] },
  // Treehouse rooms (`inside` = the outdoor place they belong to). Their edges are walls unless `left`/`right` names a room.
// Downstairs is the kitchen; upstairs the three bedrooms run in a row: Rose | Loft | Mountain.
  { name: 'Kitchen', inside: 2, img: 'treehouse-kitchen.jpg', yoff: -50, ground: 534, scale: 2.05, ambient: 'motes',
    spots: [[.2, 'Bread and flowers wait on the long kitchen table.'], [.88, 'Cushions heaped on a sofa by the window.']],
    doors: [[.51, 2, .73, 'Go back outside', 'The front door opens onto the spiral stair.'], [.7, 5, .9, 'Climb the stairs', 'The stairs wind up around the trunk.']] },
  { name: 'Mountain Bedroom', inside: 2, img: 'treehouse-study.jpg', yoff: -50, ground: 534, scale: 2.05, ambient: 'motes', left: 5,
    spots: [[.18, 'A big bed piled with quilts, lit by an old lantern.'], [.52, 'A window seat looks out to the mountains.'], [.83, 'A writing desk, with a chair pulled up to it.'], [.03, 'Back through to the loft bedroom.']] },
  { name: 'Loft Bedroom', inside: 2, img: 'treehouse-loft.jpg', yoff: -50, ground: 534, scale: 2.05, ambient: 'motes', left: 6, right: 4,
    spots: [[.08, 'A little balcony hangs over the treetops. The rose bedroom is just beyond.'], [.42, 'A bed draped in white curtains.'], [.66, 'Shelves of books grow right out of the trunk.']],
    doors: [[.9, 3, .7, 'Go down to the kitchen', 'The ladder goes down to the kitchen. Another bedroom lies beyond it.']] },
  { name: 'Rose Bedroom', inside: 2, img: 'treehouse-rose.jpg', yoff: -50, ground: 534, scale: 2.05, ambient: 'motes', right: 5,
    spots: [[.2, 'A canopy bed in rose and cream.'], [.45, 'Sunlight pours through the arched window.'], [.7, 'The balcony doors stand open to the treetops.'], [.96, 'The loft bedroom is through here.']],
    doors: [[.57, 'dress', null, 'Dress up Ember', "Lila-Bella has laid out Ember's gowns by the mirror."]] },
  { name: 'Lavender Village', inside: 1, area: 'in the village', img: 'lavender-village.jpg', yoff: -30, ground: 480, scale: .8, ambient: 'butterflies',
    leftExit: [1, .82], right: 17,
    spots: [[.07, 'The carpenter displays hand-carved toys and wooden treasures.'],
      [.25, 'Warm bread and honey pastries fill the bakery windows.'],
      [.44, 'Water splashes into the market fountain, surrounded by lavender and flowers.'],
      [.63, 'Ruffled gowns fill the dressmaker’s windows. Ember stops to admire them.'],
      [.78, 'Gold and gemstones sparkle in the jeweller’s window.'],
      [.93, 'The tailor has ribbons, spools of thread and fine fabrics for sale.']],
    doors: [[.03, 1, .82, 'Return to Lavender Fields', 'The path back to the lavender fields starts at the edge of the square.'],
      [.44, 'festival', null, 'Join the lantern festival', 'Tonight the village gathers round the fountain to light paper lanterns.'],
      [.96, 17, .06, 'Continue along the village street', 'The village continues to the right, past the inn, bookshop and café.']] },
  { name: 'Castle Hall', inside: 0, area: 'inside the castle', img: 'castle-hall.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'motes', left: 9,
    spots: [[.03, 'The ballroom lies to the left, through the grand archway.'], [.25, 'Sage-green tapestries and white dove banners hang above cushioned benches.'],
      [.5, 'A sweeping staircase rises beneath the great arched window.'], [.73, 'Polished armour stands guard beside the castle doors.']],
    doors: [[.1, 9, .9, 'Go left into the ballroom', 'The left archway opens into the royal ballroom.'],
      [.5, 10, .5, 'Go up the grand staircase', 'Climb the grand staircase to the landing and the two upstairs corridors.'],
      [.8, 0, .86, 'Return to Castle Valley', 'The castle doors lead back out into the valley.']] },
  { name: 'Royal Ballroom', inside: 0, area: 'inside the castle', img: 'castle-ballroom.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'motes', right: 8,
    spots: [[.08, 'A grand piano waits beside the fireplace.'], [.3, 'Crystal chandeliers scatter golden light across the marble.'],
      [.5, 'The wide dance floor shines beneath the blue-and-gold banners.'], [.75, 'Tall windows look over the lake and distant mountains.'],
      [.96, 'The castle hall is through the archway on the right.']],
    doors: [[.47, 'waltz', null, 'Dance a waltz', 'The musicians are tuning up. The dance floor is waiting.'],
      [.9, 8, .1, 'Go right to the castle hall', 'Return through the right archway to the castle hall.']] },
  // The landing is only the marble between the two staircases, set back from the steps at the front of the
  // painting: the painting is drawn 1.45x (`zoom`, top cropped by `yoff`) so that floor meets the party's feet,
  // and `walk` keeps them between the staircase posts; walking past either post takes that staircase.
  { name: 'Castle Stair Landing', inside: 0, area: 'upstairs in the castle', img: 'castle-landing.jpg', zoom: 1.45, yoff: -163, ground: 515, walk: [.33, .67], scale: 1.15, ambient: 'motes', left: 11, right: 12,
    spots: [[.5, 'From the stair landing, the two corridors lead left and right. The lake glitters beyond the great window.']],
    doors: [[.35, 11, .865, 'Take the left staircase to the left corridor', 'The left staircase leads to the light-green bedroom and the nursery wing.'],
      [.5, 8, .5, 'Go down to the castle hall', 'The grand staircase leads back down to the castle hall.'],
      [.65, 12, .875, 'Take the right staircase to the right corridor', 'The right staircase leads to the opposite corridor and the dark-green bedroom.']] },
  { name: 'Left Castle Corridor', inside: 0, area: 'upstairs · left wing', img: 'castle-corridor-left.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'motes', right: 10,
    spots: [[.2, 'Sage-green dove banners line the corridor beside the green and pink bedrooms.'], [.65, 'White flowers and sage-green cushioned benches sit beneath the golden tapestries.']],
    doors: [[.865, 10, .36, 'Return to the stair landing', 'The staircase leads back to the central landing.'],
      [.12, 13, .08, 'Enter the light-green bedroom', 'The light-green bedroom is beside the nursery.'],
      [.365, 16, .7, 'Enter the pink bedroom', 'The open archway leads into the pink bedroom.'],
      [.7, 15, .9, 'Enter the nursery and playroom', 'The royal children’s playroom is next to the light-green bedroom.']] },
  { name: 'Right Castle Corridor', inside: 0, area: 'upstairs · right wing', img: 'castle-corridor-right.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'motes', left: 10,
    spots: [[.2, 'Sage-green dove banners hang beside the library arches.'], [.53, 'White flowers and mountain tapestries decorate the corridor.']],
    doors: [[.12, 18, .79, 'Enter the castle library', 'Bookshelves and reading tables wait through the library archway.'],
      [.365, 18, .79, 'Enter the library reading room', 'The second library archway opens beside the reading tables.'],
      [.7, 14, .9, 'Enter the dark-green bedroom', 'The dark-green bedroom is on this side of the castle, across from the light-green bedroom wing.'],
      [.875, 10, .64, 'Return to the stair landing', 'The staircase leads back to the central landing.']] },
  { name: 'Light-Green Bedroom', inside: 0, area: 'upstairs · left wing', img: 'castle-bedroom-light.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'motes', right: 15,
    spots: [[.25, 'Pale green curtains drape the carved canopy bed.'], [.6, 'The writing desk looks out over the mountains and lake.'],
      [.78, 'A cushioned chaise and a gold-framed mirror catch the sunlight.']],
    doors: [[.08, 11, .12, 'Return to the left corridor', 'The bedroom door opens onto the left corridor.'],
      [.9, 15, .08, 'Go next door to the nursery', 'The adjoining room is the royal children’s playroom.']] },
  { name: 'Dark-Green Bedroom', inside: 0, area: 'upstairs · right wing', img: 'castle-bedroom-dark.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'motes',
    spots: [[.25, 'Deep green velvet and golden embroidery cover the canopy bed.'], [.52, 'A writing desk stands beneath the great arched window.'],
      [.78, 'Books fill the alcove beside a sofa and a glowing fireplace.']],
    doors: [[.9, 12, .7, 'Return to the right corridor', 'The bedroom door opens onto the opposite corridor.']] },
  { name: 'Royal Children’s Playroom', inside: 0, area: 'upstairs · left wing', img: 'castle-playroom.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'motes', left: 13, right: 16,
    spots: [[.08, 'A rocking horse and shelves of cuddly animals wait beside the toy cupboards.'],
      [.3, 'Soft cushions and a little reading nook make a cosy corner.'],
      [.45, 'A miniature castle fills the play table, surrounded by toy knights and animals.'],
      [.65, 'Sunlight pours over the window seat and the little drawing table.'],
      [.88, 'A green-and-cream play tent is piled with cushions and soft toys.']],
    doors: [[.08, 13, .9, 'Go next door to the light-green bedroom', 'The light-green bedroom adjoins the nursery on the left.'],
      [.7, 11, .7, 'Return to the left corridor', 'The playroom door opens onto the same corridor as the light-green bedroom.'],
      [.94, 16, .08, 'Go right to the pink bedroom', 'The pink bedroom is next door, on the right of the playroom.']] },
  { name: 'Pink Bedroom', inside: 0, area: 'upstairs · left wing', img: 'castle-bedroom-pink.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'motes', left: 15,
    spots: [[.15, 'A writing desk and armchair stand beside the pink walls and golden banners.'],
      [.45, 'A cushioned window seat looks out over the lake and mountains.'],
      [.75, 'Soft pink curtains frame the ivory-and-gold bed.']],
    doors: [[.08, 15, .94, 'Go left to the playroom', 'The royal children’s playroom is next door on the left.'],
      [.7, 11, .365, 'Return to the left corridor', 'The bedroom archway opens onto the sage-green corridor.']] },
  { name: 'Lavender Village · Inn Street', inside: 1, area: 'in the village', img: 'lavender-village-inn.jpg', yoff: -30, ground: 480, scale: .8, ambient: 'butterflies', left: 7,
    spots: [[.08, 'The shoemaker displays slippers and sturdy walking shoes.'],
      [.26, 'Wooden rocking horses and colourful toys fill the toy shop.'],
      [.42, 'Books spill onto tables outside the village bookshop.'],
      [.64, 'The inn welcomes travellers with flower-covered balconies and seats in the sunshine.'],
      [.83, 'The flower shop is fragrant with lavender and fresh blossoms.'],
      [.96, 'The café serves tea and pastries beside the cobbled street.']],
    doors: [[.03, 7, .94, 'Return to the market square', 'The first village square is back along the street to the left.']] },
  { name: 'Castle Library', inside: 0, area: 'upstairs · right wing', img: 'castle-library.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'motes',
    spots: [[.2, 'Tall shelves hold books and scrolls beside the reading tables.'], [.48, 'Cushioned sofas overlook the mountains through the great windows.'], [.92, 'A stone staircase climbs to the upper bookshelves.']],
    doors: [[.79, 12, .12, 'Return to the right corridor', 'The library door leads back to the sage-green dove corridor.']] },
  // ---- Azurea, the blue continent (reached by the old-oak road out of Castle Valley) ----
  // Shop Street | Village Square, with the Sapphire Castle across the lake from the square. `zoom` draws a painting
  // larger (top cropped by `yoff`) so its walkway meets the party's feet; `walk` keeps them on the castle terrace.
  { name: 'Azurea · Village Square', inside: 'azurea', area: 'in Azurea', img: 'azurea-square.jpg', yoff: -30, ground: 498, scale: .85, ambient: 'birds',
    left: 20, rightExit: [0, .1],
    spots: [[.06, 'A market stall under a green awning, piled with fruit and flowers.'], [.24, 'Climbing roses frame the arched doors of the old houses.'],
      [.4, 'A carved bench looks out over the water.'], [.82, 'Stone steps climb to a house hung with white flowers.']],
    doors: [[.52, 21, .5, 'Walk to the Sapphire Castle', 'Across the lake, the Sapphire Castle rises in white and blue above the waterfalls.'],
      [.94, 0, .1, 'Take the road home', 'The road home leads back to Castle Valley and Ember’s land.']] },
  { name: 'Azurea · Shop Street', inside: 'azurea', area: 'in Azurea', img: 'azurea-shops.jpg', zoom: 1.2, yoff: -133, ground: 515, scale: .8, ambient: 'butterflies',
    right: 19,
    spots: [[.06, 'The bookbinder’s window is stacked with leather-bound books.'], [.27, 'Fresh loaves and pastries fill the bakery shelves.'],
      [.43, 'A fountain splashes in the little square, with the castle beyond.'], [.64, 'Blue and white gowns glow in the dressmaker’s windows.'],
      [.8, 'Diamonds and sapphires sparkle at the jeweller’s.'], [.95, 'The herbalist sells flowers, teas and scented oils.']] },
  { name: 'Sapphire Castle', inside: 'azurea', area: 'in Azurea', img: 'azurea-castle.jpg', zoom: 1.1, yoff: -74, ground: 520, walk: [.12, .88], scale: .9, ambient: 'birds',
    leftExit: [19, .52], rightExit: [19, .52],
    spots: [[.3, 'Waterfalls spill from the castle rocks into the sapphire lake.'], [.5, 'A marble causeway, set with a blue compass star, leads up to the castle gate.'],
      [.72, 'Domed pavilions and arched bridges link the little islands.']],
    doors: [[.16, 19, .52, 'Back to the village square', 'The terrace steps lead back to Azurea’s village square.']] },
  // ---- Byzantine: a villa on a mountain lake. One painting serves both places: the lower lakeside terrace, and
  // (drawn closer with `zoom`) the upper villa terrace, reached by the steps at the right-hand end of the promenade.
  { name: 'Byzantine · Lakeside Villa', inside: 'byzantine', area: 'in Byzantine', img: 'byzantine-villa.jpg', zoom: 1.35, yoff: -38, ground: 505, walk: [.76, .99], scale: .7, ambient: 'birds',
    spots: [[.8, 'Waterfalls tumble down the green mountains into the still blue lake.'], [.86, 'Pink blossom spills over the old stone arcades.'],
      [.92, 'High above the water, the golden villa looks out across the lake.']],
    doors: [[.775, 0, .1, 'Take the boat home', 'A little boat waits at the landing to carry the party back to Castle Valley.'],
      [.945, 23, .95, 'Climb the steps to the villa', 'Stone steps wind up from the lake to the villa’s flowered terrace.']] },
  { name: 'Byzantine · Villa Terrace', inside: 'byzantine', area: 'in Byzantine', img: 'byzantine-villa.jpg', zoom: 2.2, yoff: -156, ground: 515, walk: [.82, .995], scale: .9, ambient: 'butterflies',
    spots: [[.85, 'Stone urns brim with flowers along the balustrade.'], [.9, 'Cool arcades shade the villa’s lower rooms.'],
      [.97, 'From the terrace, the whole lake glitters below.']],
    doors: [[.955, 22, .945, 'Go down to the lake', 'The steps lead back down to the lakeside promenade.'],
      [.9, 24, .46, 'Step inside the villa', 'Through the arcade, tall glass doors open into the villa’s golden foyer.']] },
  { name: 'Byzantine · Villa Foyer', inside: 'byzantine', area: 'inside the villa', img: 'byzantine-foyer.jpg', yoff: -30, ground: 520, walk: [0, .64], scale: 1.15, ambient: 'motes',   // stops at the foot of the staircase
    spots: [[.08, 'A landscape painting and a vase of white lilies on a gilded console table.'], [.32, 'An olive tree in a stone urn, beside the arches.'],
      [.45, 'A marble compass rose is set into the floor beneath the crystal chandelier.'], [.58, 'Lamplit arches lead deeper into the villa.'],
      [.62, 'A sweeping marble staircase curves up to the gallery, and tall windows fill the hall with mountain sunlight.']],
    doors: [[.45, 23, .9, 'Out to the terrace', 'The glass doors open onto the terrace and the lake beyond.'],
      [.58, 25, .05, 'Through the arches to the hallway', 'Beyond the lamplit arches, a long sunny hallway runs through the villa.']] },
  // the villa's hallways run left to right: first the hallway of doors, then the hallway of windows
  { name: 'Byzantine · Hallway of Doors', inside: 'byzantine', area: 'inside the villa', img: 'byzantine-hall-doors.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'motes',
    leftExit: [24, .58], right: 26,
    spots: [[.12, 'A carved double door. It’s locked.'], [.3, 'Through the tall window, the lake glitters between the cypresses.'],
      [.69, 'An olive tree in a stone urn stands between the windows.']],
    doors: [[.49, 27, .1, 'Open the library doors', 'The middle doors open onto the villa library, with its white grand piano.'],
      [.87, 29, .08, 'Into the dining room', 'The right-hand doors open onto the long dining room, set for a feast.']] },
  { name: 'Byzantine · Hallway of Windows', inside: 'byzantine', area: 'inside the villa', img: 'byzantine-hall-windows.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'motes',
    left: 25, right: 28,
    spots: [[.14, 'Sunlight pours through the arched windows onto a cushioned bench.'], [.5, 'A painting of the mountains hangs above white lilies on a gilded table.'],
      [.68, 'The windows look out over the lake and the snowy peaks.'], [.9, 'At the end of the hallway, music drifts from the ballroom.']] },
  { name: 'Byzantine · Villa Library', inside: 'byzantine', area: 'inside the villa', img: 'byzantine-library.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'motes',
    spots: [[.12, 'A rolling ladder leans against shelves of leather-bound books.'], [.27, 'An armchair and a little table wait beside a vase of lilies.'],
      [.4, 'A window seat looks out to the snowy mountains.'], [.68, 'A white grand piano stands open, its music ready on the stand.'], [.9, 'More shelves climb to the ceiling, packed with books.']],
    doors: [[.05, 25, .49, 'Back to the hallway', 'The library doors lead back to the hallway of doors.']] },
  // the ballroom's twin staircases frame the floor, so the party walks between them; the centre doors open onto the balcony
  { name: 'Byzantine · Ballroom', inside: 'byzantine', area: 'inside the villa', img: 'byzantine-ballroom.jpg', yoff: -30, ground: 520, walk: [.2, .8], scale: 1.15, ambient: 'motes',
    left: 26,
    spots: [[.24, 'A sweeping staircase curves up to the gallery.'], [.33, 'A gilded mirror and a little table stand between the arches.'],
      [.5, 'A crystal chandelier hangs above an inlaid marble rose.'], [.76, 'The twin staircase climbs the other side of the ballroom.']],
    doors: [[.5, 30, .5, 'Out to the balcony', 'The tall glass doors open onto a balcony high above the lake.']] },
  { name: 'Byzantine · Dining Room', inside: 'byzantine', area: 'inside the villa', img: 'byzantine-dining.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'motes',
    spots: [[.12, 'A carved sideboard holds a bowl of lemons and white lilies.'], [.35, 'Tall windows look out on the lake and the mountains.'],
      [.5, 'The long table is set with candelabra and a great bowl of lilies.'], [.86, 'An olive tree stands beside the crackling fireplace.'], [.95, 'Candles flicker beneath a gilded mirror over the mantel.']],
    doors: [[.04, 25, .87, 'Back to the hallway', 'The dining room doors lead back to the hallway of doors.']] },
  { name: 'Byzantine · Balcony', inside: 'byzantine', area: 'inside the villa', img: 'byzantine-balcony.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'butterflies',
    spots: [[.15, 'White blossom hangs from the branches over the balustrade.'], [.5, 'Snowy mountains rise above the shining lake.'], [.83, 'Stone urns spill over with white flowers.']],
    doors: [[.5, 28, .5, 'Back into the ballroom', 'The glass doors lead back into the ballroom.']] },
];
const OUTDOORS = PLACES.filter(p => p.inside === undefined).length;   // the first three countryside places loop; village is a branch
// Dress-up (at the Rose Bedroom mirror): Lila-Bella helps Ember try on her gowns. All gown cutouts share one scale
// (GOWN_H px from hair to hem), so they swap in place; `line` is what Lila-Bella says when Ember puts it on.
const GOWN_H = 713;
const GOWNS = [
  { name: 'Icy Blue', img: 'gown-icy.png', line: "Your icy blue! It's still my favourite." },
  { name: 'Sapphire Ruffles', img: 'gown-sapphire.png', line: 'Sapphire ruffles! You look like the night sky over the lake.' },
  { name: 'Ruby & Jet', img: 'gown-ruby.png', line: 'Red and black! Very brave. Very dashing.' },
  { name: 'Golden Cloak', img: 'gown-gold.png', line: 'Put the hood up! You look like sunshine out for a walk.' },
  { name: 'Lilac Blossom', img: 'gown-lilac.png', line: 'We match! Lilac, just like me.' },
  { name: 'Ivory & Crown', img: 'gown-ivory.png', line: 'Ivory and a crown... you look like a real queen.' },
  { name: 'Blush Rose', img: 'gown-blush.png', line: 'Blush rose! Those soft pink ruffles look like petals in the morning light.' },
];
const LILA_FRONT = { img: 'lila-front.png' };
// Walk-cycle sheets: `frames` per sheet; fw/fh frame size, ax torso anchor, h drawn height, face = button portrait centre/size in frame px.
// `cycle` (default CYCLE) is px walked per loop of the sheet (two steps), matched to each prince's stride so feet stay planted.
const WALKERS = [
  { name: 'Ember', img: 'ember.png', frames: 4, fw: 291, fh: 357, ax: 155, h: 200, face: [176, 44, 76] },
  { name: 'Lila-Bella', img: 'lila-bella.png', frames: 4, fw: 282, fh: 356, ax: 152, h: 166, face: [176, 52, 84] },
  { name: 'Icy-Blue Prince', img: 'blue-prince.png', frames: 8, cycle: 210, fw: 253, fh: 420, ax: 123, h: 216, face: [133, 31, 61] },
  { name: 'Ivory & Gold Prince', img: 'ivory-prince.png', frames: 8, cycle: 185, fw: 231, fh: 420, ax: 113, h: 218, face: [122, 32, 61] },
];
// Gown order matches the wardrobe. Keep Ember's height and stride while swapping
// the sheet and its torso anchor, so her position in the party stays the same.
const GOWN_WALKS = [
  WALKERS[0],
  { img: 'walk-sapphire.png', frames: 4, fw: 286, fh: 357, ax: 161, h: 200 },
  { img: 'walk-ruby.png', frames: 4, fw: 278, fh: 357, ax: 168, h: 200 },
  { img: 'walk-gold.png', frames: 4, fw: 275, fh: 357, ax: 156, h: 200 },
  { img: 'walk-lilac.png', frames: 4, fw: 277, fh: 357, ax: 156, h: 200 },
  { img: 'walk-ivory.png', frames: 4, fw: 285, fh: 357, ax: 174, h: 200 },
  { img: 'walk-blush.png', frames: 4, fw: 287, fh: 357, ax: 173, h: 200 },
];

const RESIDENTS = [
  { name: 'Evelynn', place: 3, x: .34, img: 'evelynn.png', h: 205, line: 0,
    lines: ["Welcome to my treehouse, Ember. I’m Evelynn. Come in and make yourself at home.", "The kitchen always smells of fresh bread. Will you stay for a cup of tea?", "Upstairs you’ll find the bedrooms. Lila-Bella is waiting by the mirror in the Rose Bedroom."] },
  { name: 'Hendrix', place: 18, x: .63, img: 'hendrix.png', h: 220, line: 0,
    lines: ["Ah, a visitor! I’m Hendrix, keeper of this library. What stories do you enjoy, Ember?", "These shelves hold tales of the castle, the mountain lake, and the paths beyond the lavender fields.", "Take your time among the books. Every good adventure begins with a little curiosity."] },
];
let nearbyResident = null;
function talkToResident() {
  if (!nearbyResident || dressing || fadeDir) return;
  const resident = nearbyResident;
  say(`${resident.name}: ${resident.lines[resident.line]}`);
  resident.line = (resident.line + 1) % resident.lines.length;
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
let K = 1;
function resize() {
  const r = canvas.getBoundingClientRect();
  if (!r.width) return;
  K = Math.min(2.5, (r.width / VW) * (window.devicePixelRatio || 1));
  canvas.width = Math.round(VW * K);
  canvas.height = Math.round(VH * K);
}
new ResizeObserver(resize).observe(canvas);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ---- state ----
let place = 0, worldW = 1800, camX = 0, t = 0;
let lead = 0, together = true;
let leaderX = 160, facing = 1, moving = false;
let trail = [];                 // leader positions every SAMPLE px, newest last
const walkerState = WALKERS.map(() => ({ x: 0, dist: 0, facing: 1, moving: false }));
let fade = 0, fadeDir = 0, pending = null, placardT = 0;
let ambient = [];
const keys = { left: false, right: false, hurry: false };

// ---- party trail ----
const sizeAt = () => PLACES[place].scale || 1;
function resetTrail(x, dir) {
  trail = [];
  const n = Math.ceil(SPACING * sizeAt() * 3 / SAMPLE) + 2;
  for (let k = n; k >= 0; k--) trail.push({ x: x - dir * k * SAMPLE, f: dir });
}
function pushTrail(x, dir) {
  let last = trail[trail.length - 1];
  while (Math.abs(x - last.x) >= SAMPLE) {
    last = { x: last.x + Math.sign(x - last.x) * SAMPLE, f: dir };
    trail.push(last);
  }
  if (trail.length > 600) trail.splice(0, trail.length - 600);
}
function party() { return [lead, ...WALKERS.map((_, i) => i).filter(i => i !== lead)]; }

// ---- places ----
// `from` is the edge walked in from ('left'/'right'), or the fraction of the way along where a door lets out
function enterPlace(i, from) {
  place = i;
  nearbyResident = null;
  $('talkBtn').hidden = true;
  $('speech').classList.remove('on');
  const P = PLACES[place], bg = P.bgImg;
  worldW = bg.width * BG_H * (P.zoom || 1) / bg.height;
  facing = from === 'right' ? -1 : 1;
  leaderX = typeof from === 'number' ? from * worldW : from === 'right' ? worldW - 90 : 90;
  if (P.walk) leaderX = clamp(leaderX, P.walk[0] * worldW + 66, P.walk[1] * worldW - 66);
  resetTrail(leaderX, facing);
  camX = clamp(leaderX - VW / 2 + facing * 90, 0, worldW - VW);
  ambient = [];
  const outdoor = P.inside ?? place;
  $('placeName').textContent = P.name;
  $('placeNum').textContent = P.area || (P.inside !== undefined ? 'in the treehouse' : `${place + 1} of ${OUTDOORS}`);
  document.querySelectorAll('#places .place').forEach(b => b.setAttribute('aria-current', Number(b.dataset.place) === (P.area ? place : outdoor) ? 'true' : 'false'));
  $('placard').textContent = P.name; placardT = 2.2;
  caption('');
}
// where the party can walk: the whole painting, or a place's `walk` stretch (fractions of its width)
const walkLo = () => PLACES[place].walk ? PLACES[place].walk[0] * worldW : 24;
const walkHi = () => PLACES[place].walk ? PLACES[place].walk[1] * worldW : worldW - 24;
// walking off an edge: outdoors loops round the realm; indoors, edges are walls unless they lead to another room
function walkOff(side) {
  const P = PLACES[place];
  if (P.edgeExit) return travel(...P.edgeExit);
  if (P[side + 'Exit']) return travel(...P[side + 'Exit']);
  if (P.inside === undefined) return travel((place + (side === 'right' ? 1 : -1) + OUTDOORS) % OUTDOORS, side === 'right' ? 'left' : 'right');
  const next = P[side];
  if (next !== undefined) travel(next, side === 'right' ? 'left' : 'right');
}
let door = null;                // the door the leader is standing at, if any
function useDoor() {
  if (!door || fadeDir) return;
  if (door[1] === 'dress') openDressUp(); else if (PASTIMES[door[1]]) openPastime(door[1]); else travel(door[1], door[2]);
}
function travel(i, from) { fadeTo(() => enterPlace(i, from)); }

// ---- the atlas: Xanthe's Celadonia. Click a land to travel there (lands with no places yet can't be visited).
// x, y: centre of the land's painted name, w, h: the clickable box, all as fractions of the map image.
const LANDS = [
  { key: 'celadonia', name: 'Celadonia', x: .79, y: .274, w: .19, h: .07, to: [0, .5], note: 'Ember’s home' },
  { key: 'azurea', name: 'Azurea', x: .069, y: .72, w: .15, h: .07, to: [19, .5], note: 'The blue land' },
  { key: 'xanthe', name: 'Xanthe', x: .1, y: .176, w: .16, h: .07 },
  { key: 'byzantine', name: 'Byzantine', x: .13, y: .915, w: .17, h: .07, to: [22, .85], note: 'The lakeside villa' },
  { key: 'sangria', name: 'Sangria', x: .925, y: .795, w: .14, h: .07 },
];
const landOf = i => typeof PLACES[i].inside === 'string' ? PLACES[i].inside : 'celadonia';
function buildAtlas() {
  LANDS.forEach(L => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'land' + (L.to ? '' : ' locked'); b.dataset.land = L.key;
    Object.assign(b.style, { left: `${L.x * 100}%`, top: `${L.y * 100}%`, width: `${L.w * 100}%`, height: `${L.h * 100}%` });
    b.innerHTML = `<span class="badge"></span>`;
    if (L.to) b.addEventListener('click', () => {
      $('mapDialog').close();
      if (landOf(place) !== L.key) travel(...L.to);
    });
    else b.setAttribute('aria-disabled', 'true');
    $('atlasFrame').appendChild(b);
  });
  $('mapBtn').addEventListener('click', openMap);
  $('mapClose').addEventListener('click', () => $('mapDialog').close());
  $('mapDialog').addEventListener('click', e => { if (e.target === $('mapDialog')) $('mapDialog').close(); });   // click outside the map
}
function openMap() {
  if (dressing || pastime || fadeDir || $('mapDialog').open) return;
  keys.left = keys.right = keys.hurry = false;
  const here = landOf(place);
  document.querySelectorAll('.land').forEach(b => {
    const L = LANDS.find(l => l.key === b.dataset.land), isHere = L.key === here;
    b.classList.toggle('here', isHere);
    b.querySelector('.badge').textContent = isHere ? 'You are here' : L.to ? `Travel to ${L.name}` : 'Not yet explored';
    b.setAttribute('aria-label', isHere ? `${L.name}, ${L.note}. You are here` : L.to ? `Travel to ${L.name}, ${L.note}` : `${L.name}, not yet explored`);
  });
  $('mapDialog').showModal();
  document.querySelector('.land.here')?.focus();
}
function fadeTo(fn) {
  if (fadeDir) return;
  pending = fn; fadeDir = 1;
}

// ---- dress-up ----
let dressing = false, gown = 0, prevGown = 0, swapT = 1, sparkles = [];
try {
  const saved = Number(localStorage.getItem('realm-ember-gown'));
  if (Number.isInteger(saved) && saved >= 0 && saved < GOWNS.length) gown = prevGown = saved;
} catch (_) { /* The wardrobe also works when storage is unavailable. */ }
function openDressUp() {
  fadeTo(() => {
    if (place !== 6) enterPlace(6, .57);
    dressing = true; keys.left = keys.right = keys.hurry = false;
    document.body.classList.add('dressing');
    $('dressPanel').hidden = false;
    door = null; $('doorBtn').hidden = true; caption('');
    $('placeNum').textContent = 'dressing up';
    $('placard').textContent = 'Dress Up'; placardT = 1.8;
    say(gown ? GOWNS[gown].line : "Ember, let's play dress-up! Which gown first?");
    $('gown-' + gown).focus({ preventScroll: true });
  });
}
function closeDressUp() {
  fadeTo(() => {
    dressing = false; sparkles = [];
    document.body.classList.remove('dressing');
    $('dressPanel').hidden = true; $('speech').classList.remove('on');
    $('placeNum').textContent = 'in the treehouse';
    $('dressStart').focus({ preventScroll: true });
  });
}
function pickGown(i) {
  i = (i + GOWNS.length) % GOWNS.length;
  if (i === gown) return;
  prevGown = gown; gown = i; swapT = reduceMotion ? 1 : 0;
  document.querySelectorAll('.gown').forEach((b, k) => b.setAttribute('aria-pressed', k === gown ? 'true' : 'false'));
  $('gownName').textContent = GOWNS[gown].name;
  try { localStorage.setItem('realm-ember-gown', String(gown)); } catch (_) {}
  say(GOWNS[gown].line);
  if (!reduceMotion) for (let k = 0; k < 46; k++) {
    const a = Math.random() * 7, r = Math.random();
    sparkles.push({ x: EMBER_X + Math.cos(a) * r * 150, y: 300 + Math.sin(a) * r * 230, life: .6 + Math.random() * .6, age: 0, sz: 3 + Math.random() * 5 });
  }
}
function say(text) {
  const el = $('speech');
  el.textContent = text;
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');   // restart the pop
}

// ---- pastimes: a picnic in Aspen Meadow, a waltz in the Royal Ballroom and the lantern festival in Lavender Village.
// Each is played over its place's painting from a fixed view (`at` = where along the painting the view is centred),
// with an intro card, a game, and a results card. `lowWins` means a lower score is better (picnic tries).
const PASTIMES = {
  picnic: { place: 2, at: .3, name: 'Picnic', back: 'Back to the meadow', lowWins: true,
    eyebrow: 'A summer afternoon in Aspen Meadow', title: 'Picnic under the Aspens',
    intro: 'Lila-Bella has packed the basket and covered every dish with a napkin. Lift two napkins at a time to find the matching treats and lay out the picnic.',
    keys: 'Click or tap a napkin · or the arrow keys and Enter', go: 'Spread the blanket',
    start: startPicnic, update: updatePicnic, render: renderPicnic, key: keyPicnic, tap: tapPicnic, result: picnicResult },
  waltz: { place: 9, at: .47, name: 'Waltz', back: 'Back to the ballroom',
    eyebrow: 'An evening in the Royal Ballroom', title: 'The Royal Waltz',
    intro: 'The musicians strike up a waltz and the Ivory & Gold Prince offers Ember his hand. Follow the steps as they glide into the golden ring: step left, step right, and twirl.',
    keys: '← step left · ↑ twirl · → step right · or tap the step buttons', go: 'Take his hand',
    start: startWaltz, update: updateWaltz, render: renderWaltz, key: keyWaltz, tap: () => {}, result: waltzResult },
  festival: { place: 7, at: .44, name: 'Lantern festival', back: 'Back to the square',
    eyebrow: 'Midsummer night in Lavender Village', title: 'The Lantern Festival',
    intro: 'The whole village has gathered by the fountain. Paper lanterns drift up into the dusk: light as many as you can before they float away. Golden wish lanterns count for five.',
    keys: 'Click or tap a lantern · or ← → to walk and Space to light', go: 'Light the lanterns',
    start: startFestival, update: updateFestival, render: renderFestival, key: keyFestival, tap: tapFestival, result: festivalResult },
};
let pastime = null;   // { key, def, phase: 'intro' | 'play' | 'done', ...that game's own state }
const rand = (a, b) => a + Math.random() * (b - a);
const shuffle = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function buildPastimes() {
  Object.entries(PASTIMES).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'place'; b.textContent = def.name; b.disabled = true;
    b.addEventListener('click', () => openPastime(key));
    $('pastimes').appendChild(b);
  });
  $('pcGo').addEventListener('click', beginPastime);
  $('pcBack').addEventListener('click', closePastime);
  $('pastimeLeave').addEventListener('click', closePastime);
  document.querySelectorAll('#steps button').forEach(b => b.addEventListener('pointerdown', e => {
    e.preventDefault();   // keep focus off the button so Space and the arrows still reach the dance
    if (pastime && pastime.phase === 'play') waltzStep(pastime, b.dataset.step);
  }));
  $('stage').addEventListener('pointerdown', e => {
    if (!pastime || pastime.phase !== 'play' || e.target !== canvas) return;
    const r = canvas.getBoundingClientRect();
    pastime.def.tap(pastime, (e.clientX - r.left) / r.width * VW, (e.clientY - r.top) / r.height * VH);
  });
}
function openPastime(key) {
  if (dressing || pastime || fadeDir) return;
  const def = PASTIMES[key];
  fadeTo(() => {
    if (place !== def.place) enterPlace(def.place, def.at);
    pastime = { key, def, phase: 'intro' };
    def.start(pastime);
    keys.left = keys.right = keys.hurry = false;
    document.body.classList.add('pastime');
    door = null; $('doorBtn').hidden = true; $('talkBtn').hidden = true; caption(''); placardT = 0;
    showPastimeCard(def.eyebrow, def.title, def.intro, def.keys, def.go);
  });
}
function beginPastime() {
  const s = pastime;
  if (!s || fadeDir === 1) return;
  audio();
  s.phase = 'play';
  s.def.start(s);
  $('pastimeCard').hidden = true; $('pastimeHud').hidden = false;
  $('steps').hidden = s.key !== 'waltz';
  $('speech').classList.remove('on');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}
function finishPastime() {
  const s = pastime;
  if (!s || s.phase !== 'play') return;
  s.phase = 'done';
  const r = s.def.result(s);
  const storeKey = 'realm-pastime-' + s.key;
  let best = null;
  try { const v = localStorage.getItem(storeKey); best = v === null ? null : Number(v); } catch (_) {}
  const better = r.score > 0 && (best === null || (s.def.lowWins ? r.score < best : r.score > best));
  if (better) try { localStorage.setItem(storeKey, String(r.score)); } catch (_) {}
  tone([523, 659, 784, 1047], .5, 'triangle', .04, .12);
  $('steps').hidden = true;
  setTimeout(() => {
    if (pastime !== s) return;
    showPastimeCard('Well done', r.title, r.text + (better ? ' That’s a new best!' : best !== null ? ` Your best is ${best}.` : ''), '', 'Play again');
  }, 1000);
}
function closePastime() {
  if (!pastime || fadeDir) return;
  fadeTo(() => {
    stopWaltzMusic(pastime);
    pastime = null;
    document.body.classList.remove('pastime');
    ['pastimeCard', 'pastimeHud', 'steps'].forEach(id => { $(id).hidden = true; });
    $('speech').classList.remove('on');
    if (musicOn) fadeMusic(THEME_VOLUME);
  });
}
function showPastimeCard(eyebrow, title, text, keyText, go) {
  $('pcEyebrow').textContent = eyebrow; $('pcTitle').textContent = title; $('pcText').textContent = text;
  $('pcKeys').textContent = keyText; $('pcKeys').hidden = !keyText;
  $('pcGo').textContent = go; $('pcBack').textContent = pastime.def.back;
  $('pastimeHud').hidden = true; $('pastimeCard').hidden = false;
  $('pcGo').focus({ preventScroll: true });
}
function pastimeHud(main, info) { $('pastimeScore').textContent = main; $('pastimeInfo').textContent = info; }

// sound effects share the music switch: with Ember's theme off, the pastimes are quiet too
let ac = null;
function audio() {
  if (!ac) { try { const A = window.AudioContext || window.webkitAudioContext; ac = A ? new A() : null; } catch (_) { ac = null; } }
  if (ac && ac.state === 'suspended') ac.resume();
  return ac;
}
function tone(freqs, dur, type = 'sine', vol = .05, gap = .06) {
  if (!ac || !musicOn) return;
  const t0 = ac.currentTime;
  freqs.forEach((f, i) => {
    const o = ac.createOscillator(), g = ac.createGain(), s = t0 + i * gap;
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(vol, s + .01); g.gain.exponentialRampToValueAtTime(.0001, s + dur);
    o.connect(g).connect(ac.destination); o.start(s); o.stop(s + dur + .05);
  });
}

// shared scenery and sparkle helpers
function renderPastime() {
  const s = pastime, P = PLACES[s.def.place], z = P.zoom || 1, w = P.bgImg.width * BG_H * z / P.bgImg.height;
  ctx.drawImage(P.bgImg, -clamp(s.def.at * w - VW / 2, 0, w - VW), P.yoff, w, BG_H * z);
  s.def.render(s);
  (s.parts || []).forEach(p => { ctx.globalAlpha = Math.max(0, 1 - p.life / p.max); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r || 2.4, 0, 7); ctx.fill(); });
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  (s.pops || []).forEach(p => {
    ctx.globalAlpha = Math.max(0, 1 - p.life / 1.1); ctx.font = `700 ${p.size || 22}px "Alegreya Sans", sans-serif`;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(40,25,10,.55)'; ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = p.col || '#fff3c9'; ctx.fillText(p.text, p.x, p.y);
  });
  ctx.globalAlpha = 1;
}
function burst(s, x, y, cols, n, speed = 150, gravity = 120) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), v = rand(.3, 1) * speed;
    s.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0, max: rand(.6, 1.1), col: cols[i % cols.length], g: gravity, r: rand(1.6, 3) });
  }
}
function popup(s, x, y, text, col, size) { s.pops.push({ x, y, text, col, size, life: 0 }); }
function stepSparkles(s, dt) {
  s.parts.forEach(p => { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; });
  s.parts = s.parts.filter(p => p.life < p.max);
  s.pops.forEach(p => { p.life += dt; p.y -= 34 * dt; });
  s.pops = s.pops.filter(p => p.life < 1.1);
}
function glowDot(x, y, r, col) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
// a friend standing in a pastime scene: `w` is a walk sheet, `squash` narrows them for a twirl
function drawFigure(w, x, y, h, facing, frame = 0, squash = 1) {
  if (!w.img_) return;
  const k = h / w.fh;
  ctx.fillStyle = 'rgba(30,25,15,.26)';
  ctx.beginPath(); ctx.ellipse(x, y, w.fw * k * .34, 8, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.scale(facing * (Math.abs(squash) < .08 ? .08 : squash), 1);
  ctx.drawImage(w.img_, frame * w.fw, 0, w.fw, w.fh, -w.ax * k, -(w.fh - 2) * k, w.fw * k, w.fh * k);
  ctx.restore();
}
const emberSheet = () => GOWN_WALKS[gown];

// ---- picnic: lift two napkins at a time to find matching treats ----
const FOODS = {
  strawberries: 'Strawberries! The sweetest ones always hide at the bottom of the basket.',
  pie: 'Evelynn’s apple pie, still warm from the oven.',
  lemonade: 'Lemonade with a sprig of mint, just how you like it.',
  sandwiches: 'Cucumber sandwiches, with the crusts cut off.',
  cupcakes: 'Rose cupcakes! I iced them myself.',
  teapot: 'A pot of lavender tea from the village.',
  cheese: 'A wedge of honey cheese from the market.',
  grapes: 'Grapes from the castle garden.',
};
const PICNIC_ROWS = [[378, .8], [434, .9], [498, 1]];   // three rows of four dishes, smaller towards the back
function startPicnic(s) {
  const foods = shuffle(Object.keys(FOODS)).slice(0, 6);
  s.cards = shuffle([...foods, ...foods]).map((food, i) => {
    const [y, k] = PICNIC_ROWS[Math.floor(i / 4)];
    return { food, x: 480 + (i % 4 - 1.5) * 124 * k, y, k, open: false, matched: false, lift: 0 };
  });
  s.open = []; s.wait = 0; s.endT = 0; s.tries = 0; s.pairs = 0; s.cursor = 0; s.kbd = false; s.parts = []; s.pops = [];
  picnicHud(s);
}
function picnicHud(s) { pastimeHud(`Pairs ${s.pairs} of 6`, `${s.tries} ${s.tries === 1 ? 'try' : 'tries'}`); }
function liftNapkin(s, i) {
  const c = s.cards[i];
  if (!c || c.open || c.matched || s.open.length >= 2 || s.endT) return;
  c.open = true; s.open.push(c);
  tone([587 + s.open.length * 90], .14, 'triangle', .03);
  if (s.open.length === 2) {
    s.tries++;
    const [a, b] = s.open;
    if (a.food === b.food) {
      a.matched = b.matched = true; a.open = b.open = false; s.open = []; s.pairs++;
      [a, b].forEach(c => burst(s, c.x, c.y - 20 * c.k, ['#fff3c9', '#f6c453', '#ffffff'], 14, 110, 60));
      popup(s, (a.x + b.x) / 2, Math.min(a.y, b.y) - 50, 'A pair!');
      tone([784, 988, 1175], .3, 'triangle', .04);
      say(`Lila-Bella: ${FOODS[a.food]}`);
      if (s.pairs === 6) s.endT = 1.4;
    } else s.wait = .9;
  }
  picnicHud(s);
}
function updatePicnic(s, dt) {
  s.cards.forEach(c => { c.lift = clamp(c.lift + (c.open || c.matched ? 1 : -1) * dt * 6, 0, 1); });
  if (s.wait > 0 && (s.wait -= dt) <= 0) { s.open.forEach(c => { c.open = false; }); s.open = []; }
  if (s.endT > 0 && (s.endT -= dt) <= 0) { s.endT = 0; finishPastime(); }
  stepSparkles(s, dt);
}
function keyPicnic(s, e) {
  const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4, a: -1, d: 1, w: -4, s: 4 };
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k in moves) {
    const n = s.cursor + moves[k];
    if (Math.abs(moves[k]) === 4 ? n >= 0 && n < 12 : Math.floor(n / 4) === Math.floor(s.cursor / 4)) s.cursor = n;
    s.kbd = true; return true;
  }
  if (e.key === 'Enter' || e.key === ' ') { if (!e.repeat) { s.kbd = true; liftNapkin(s, s.cursor); } return true; }
  return false;
}
function tapPicnic(s, x, y) {
  const i = s.cards.findIndex(c => ((x - c.x) / (54 * c.k)) ** 2 + ((y - c.y + 14 * c.k) / (40 * c.k)) ** 2 < 1);
  if (i >= 0) { s.kbd = false; s.cursor = i; liftNapkin(s, i); }
}
function picnicResult(s) {
  const title = s.tries <= 9 ? 'A perfect picnic' : s.tries <= 14 ? 'A lovely afternoon' : 'A long, lazy afternoon';
  return { score: s.tries, title, text: `You laid out all six treats in ${s.tries} tries.` };
}
function renderPicnic(s) {
  // a gingham blanket in perspective: corners top-left, top-right, bottom-right, bottom-left
  const C = [[262, 340], [698, 340], [812, 538], [148, 538]];
  const at = (u, v) => [lerp(lerp(C[0][0], C[1][0], u), lerp(C[3][0], C[2][0], u), v), lerp(lerp(C[0][1], C[1][1], u), lerp(C[3][1], C[2][1], u), v)];
  ctx.fillStyle = 'rgba(30,40,10,.25)';
  ctx.beginPath(); C.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x + 6, y + 6)); ctx.fill();
  ctx.fillStyle = '#c94b4b';
  ctx.beginPath(); C.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y)); ctx.fill();
  const NU = 10, NV = 6;
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
    const light = (i % 2) + (j % 2);
    if (!light) continue;
    ctx.fillStyle = light === 2 ? 'rgba(255,246,232,.85)' : 'rgba(255,240,225,.42)';
    ctx.beginPath();
    [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].forEach(([u, v], n) => { const [x, y] = at(u / NU, v / NV); ctx[n ? 'lineTo' : 'moveTo'](x, y); });
    ctx.fill();
  }
  drawBasket(760, 352);
  drawFigure(emberSheet(), 120, 536, 250, 1);
  drawFigure(WALKERS[1], 852, 530, 208, -1);

  s.cards.forEach((c, i) => {
    ctx.fillStyle = 'rgba(40,30,20,.18)';
    ctx.beginPath(); ctx.ellipse(c.x + 3, c.y + 5 * c.k, 48 * c.k, 15 * c.k, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fbf8f1';
    ctx.beginPath(); ctx.ellipse(c.x, c.y, 46 * c.k, 15 * c.k, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(120,150,190,.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(c.x, c.y, 38 * c.k, 11 * c.k, 0, 0, 7); ctx.stroke();
    if (c.lift > 0) drawFood(c.food, c.x, c.y, c.k * 1.2);
    if (c.lift < 1) drawNapkin(c.x, c.y - c.lift * 46 * c.k, c.k, 1 - c.lift);
    if (s.kbd && i === s.cursor && s.phase === 'play') {
      ctx.strokeStyle = '#ffd56a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(c.x, c.y - 10 * c.k, 58 * c.k, 40 * c.k, 0, 0, 7); ctx.stroke();
    }
  });
}
function drawBasket(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = '#7a4f24'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.ellipse(0, -8, 34, 34, 0, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = '#b07a3c';
  ctx.beginPath(); ctx.moveTo(-42, -10); ctx.lineTo(42, -10); ctx.lineTo(34, 26); ctx.lineTo(-34, 26); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(90,55,20,.55)'; ctx.lineWidth = 2;
  for (let yy = -2; yy < 26; yy += 7) { ctx.beginPath(); ctx.moveTo(-40, yy); ctx.lineTo(40, yy); ctx.stroke(); }
  for (let xx = -36; xx <= 36; xx += 9) { ctx.beginPath(); ctx.moveTo(xx, -10); ctx.lineTo(xx * .85, 26); ctx.stroke(); }
  ctx.fillStyle = '#f6efe0';
  ctx.beginPath(); ctx.moveTo(-44, -12); ctx.lineTo(10, -12); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawNapkin(x, y, k, alpha) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(k, k);
  ctx.beginPath(); ctx.moveTo(-44, 2); ctx.bezierCurveTo(-42, -46, 42, -46, 44, 2); ctx.quadraticCurveTo(0, 16, -44, 2); ctx.closePath();
  ctx.fillStyle = '#f7f0e2'; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(74,112,170,.33)';
  for (let i = -48; i < 48; i += 13) ctx.fillRect(i, -46, 6, 64);
  for (let j = -44; j < 16; j += 13) ctx.fillRect(-48, j, 96, 6);
  ctx.restore();
  ctx.strokeStyle = 'rgba(60,50,40,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}
function drawFood(food, x, y, k) {
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  const fill = (col, f) => { ctx.fillStyle = col; ctx.beginPath(); f(); ctx.fill(); };
  if (food === 'strawberries') {
    [[-15, -6], [15, -6], [0, -12]].forEach(([px, py]) => {
      fill('#d63340', () => { ctx.moveTo(px - 10, py - 7); ctx.quadraticCurveTo(px, py - 13, px + 10, py - 7); ctx.quadraticCurveTo(px + 9, py + 6, px, py + 12); ctx.quadraticCurveTo(px - 9, py + 6, px - 10, py - 7); });
      fill('#4f9a3a', () => { ctx.moveTo(px - 8, py - 9); ctx.lineTo(px, py - 4); ctx.lineTo(px + 8, py - 9); ctx.lineTo(px, py - 13); });
      ctx.fillStyle = '#f7da78'; [[-4, -1], [3, 1], [-1, 5], [4, -4]].forEach(([dx, dy]) => ctx.fillRect(px + dx, py + dy, 1.6, 1.6));
    });
  } else if (food === 'pie') {
    fill('#d9a35a', () => ctx.ellipse(0, -6, 32, 13, 0, 0, 7));
    fill('#b4552f', () => ctx.ellipse(0, -8, 26, 9, 0, 0, 7));
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, -8, 26, 9, 0, 0, 7); ctx.clip();
    ctx.strokeStyle = '#efc685'; ctx.lineWidth = 3.2;
    for (let i = -30; i <= 30; i += 11) { ctx.beginPath(); ctx.moveTo(i - 8, -18); ctx.lineTo(i + 8, 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i + 8, -18); ctx.lineTo(i - 8, 2); ctx.stroke(); }
    ctx.restore();
  } else if (food === 'lemonade') {
    fill('rgba(250,224,110,.92)', () => { ctx.moveTo(-15, -40); ctx.lineTo(15, -40); ctx.quadraticCurveTo(19, -20, 15, 0); ctx.lineTo(-15, 0); ctx.quadraticCurveTo(-19, -20, -15, -40); });
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(19, -22, 8, -1.3, 1.3); ctx.stroke();
    fill('#f4d03f', () => ctx.arc(-2, -20, 7, 0, 7));
    ctx.strokeStyle = '#fff6c4'; ctx.lineWidth = 1;
    for (let a = 0; a < 6; a++) { ctx.beginPath(); ctx.moveTo(-2, -20); ctx.lineTo(-2 + Math.cos(a) * 6, -20 + Math.sin(a) * 6); ctx.stroke(); }
    fill('#5aa64a', () => ctx.ellipse(6, -42, 6, 3, -.5, 0, 7));
  } else if (food === 'sandwiches') {
    [[-6, 0], [6, -9]].forEach(([dx, dy]) => {
      fill('#f3dcaa', () => { ctx.moveTo(dx - 24, dy); ctx.lineTo(dx + 20, dy); ctx.lineTo(dx - 24, dy - 24); ctx.closePath(); });
      ctx.strokeStyle = '#c4924d'; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = '#7dbb54'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(dx - 22, dy - 21); ctx.lineTo(dx + 17, dy - 1); ctx.stroke();
    });
  } else if (food === 'cupcakes') {
    [-14, 14].forEach(dx => {
      fill('#e79db2', () => { ctx.moveTo(dx - 10, -14); ctx.lineTo(dx + 10, -14); ctx.lineTo(dx + 7, 0); ctx.lineTo(dx - 7, 0); });
      fill('#fde6ee', () => { ctx.ellipse(dx, -18, 12, 7, 0, 0, 7); ctx.ellipse(dx, -25, 8, 6, 0, 0, 7); });
      fill('#c8202f', () => ctx.arc(dx, -32, 3.5, 0, 7));
    });
  } else if (food === 'teapot') {
    ctx.strokeStyle = '#d58fa3'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(-22, -16, 9, 1.8, 4.6); ctx.stroke();
    fill('#ecb9c7', () => { ctx.moveTo(16, -12); ctx.quadraticCurveTo(28, -16, 32, -30); ctx.lineTo(28, -30); ctx.quadraticCurveTo(24, -20, 14, -20); });
    fill('#f1c5d1', () => ctx.ellipse(0, -15, 21, 15, 0, 0, 7));
    ctx.strokeStyle = '#d9b14c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -15, 21, 4, 0, 0, Math.PI); ctx.stroke();
    fill('#ecb9c7', () => ctx.ellipse(0, -29, 11, 4, 0, 0, 7));
    fill('#d9b14c', () => ctx.arc(0, -34, 3.5, 0, 7));
  } else if (food === 'cheese') {
    fill('#e3ac2f', () => { ctx.moveTo(-26, -2); ctx.lineTo(24, -2); ctx.lineTo(24, -16); ctx.lineTo(-26, -10); });
    fill('#f6d364', () => { ctx.moveTo(-26, -10); ctx.lineTo(24, -16); ctx.lineTo(20, -26); });
    ctx.fillStyle = '#c99222'; [[-10, -6, 2.5], [8, -8, 3], [16, -5, 2]].forEach(([hx, hy, r]) => { ctx.beginPath(); ctx.arc(hx, hy, r, 0, 7); ctx.fill(); });
  } else if (food === 'grapes') {
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -34); ctx.quadraticCurveTo(4, -40, 10, -40); ctx.stroke();
    fill('#6ea24a', () => ctx.ellipse(12, -36, 8, 4, -.4, 0, 7));
    [[-12, -26], [0, -27], [12, -26], [-6, -17], [6, -17], [0, -8], [-14, -14], [14, -14]].forEach(([gx, gy]) => {
      fill('#7b4a9e', () => ctx.arc(gx, gy, 6, 0, 7));
      fill('rgba(255,255,255,.35)', () => ctx.arc(gx - 2, gy - 2, 1.8, 0, 7));
    });
  }
  ctx.restore();
}

// ---- waltz: press each step as it glides into the golden ring, in time with the band ----
const BEAT = 60 / 100;    // seconds per beat; three beats to the bar
const WALTZ_BARS = 32;    // a sixteen-bar tune, played twice
// the tune in D major: each bar is [midi note, beats] pairs (0 is a rest), with one chord per bar
const MELODY = [
  [[74, 2], [78, 1]], [[81, 3]], [[79, 1], [78, 1], [76, 1]], [[78, 2], [74, 1]],
  [[76, 2], [73, 1]], [[69, 3]], [[74, 1], [76, 1], [78, 1]], [[74, 3]],
  [[79, 2], [83, 1]], [[81, 2], [79, 1]], [[78, 2], [81, 1]], [[78, 1], [74, 1], [71, 1]],
  [[76, 2], [79, 1]], [[78, 1], [76, 1], [73, 1]], [[74, 3]], [[74, 2], [0, 1]],
];
const HARMONY = 'D D G D A A D D G G D Bm Em A D D'.split(' ');
const CHORDS = { D: [50, [62, 66, 69]], G: [43, [62, 67, 71]], A: [45, [61, 64, 69]], Bm: [47, [62, 66, 71]], Em: [52, [64, 67, 71]] };
const midiHz = n => 440 * 2 ** ((n - 69) / 12);
const STEP_KEYS = { left: '←', up: '↑', right: '→' };
const RING_X = 176, TRACK_Y = 128, GLIDE = 250;   // px per second the steps travel along the ribbon
function waltzChart() {
  const steps = [];
  for (let bar = 1; bar < WALTZ_BARS - 1; bar++) {
    const kind = bar % 4 === 3 ? 'up' : bar % 2 ? 'left' : 'right';
    steps.push({ t: bar * 3 * BEAT, kind });
    // the second time through the tune, the even bars add a step back on the third beat
    if (bar >= 16 && kind === 'right') steps.push({ t: (bar * 3 + 2) * BEAT, kind: 'left' });
  }
  steps.push({ t: (WALTZ_BARS - 1) * 3 * BEAT, kind: 'up' });
  return steps;
}
function startWaltz(s) {
  stopWaltzMusic(s);
  s.steps = waltzChart(); s.time = -1.2; s.score = 0; s.hits = 0; s.graceful = 0; s.streak = 0;
  s.spin = 0; s.flow = s.phase === 'play' ? 0 : .3; s.twirl = 0; s.cx = 480; s.cxTo = 480; s.ringPulse = 0;
  s.parts = []; s.pops = [];
  if (s.phase === 'play') {
    fadeMusic(0);
    playWaltzMusic(s);
    waltzHud(s);
  }
}
function playWaltzMusic(s) {
  if (!audio()) return;
  const out = ac.createGain();
  out.gain.value = musicOn ? .9 : 0; out.connect(ac.destination);
  s.out = out; s.t0 = ac.currentTime - s.time;   // song time 0 is the downbeat of the first bar
  const note = (f, at, dur, type, vol) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + .02); g.gain.exponentialRampToValueAtTime(.0001, at + dur);
    o.connect(g).connect(out); o.start(at); o.stop(at + dur + .05);
  };
  for (let bar = 0; bar < WALTZ_BARS; bar++) {
    const at = s.t0 + bar * 3 * BEAT, [bass, triad] = CHORDS[HARMONY[bar % 16]];
    note(midiHz(bass), at, BEAT * 1.6, 'triangle', .1);                                   // oom
    [1, 2].forEach(b => triad.forEach(n => note(midiHz(n), at + b * BEAT, BEAT * .6, 'sine', .022)));   // pah, pah
    let beat = 0;
    MELODY[bar % 16].forEach(([n, len]) => { if (n) note(midiHz(n), at + beat * BEAT, len * BEAT * .95, 'triangle', .055); beat += len; });
  }
}
function stopWaltzMusic(s) {
  if (!s || !s.out) return;
  const out = s.out; s.out = null;
  try { out.gain.setTargetAtTime(0, ac.currentTime, .08); } catch (_) {}
  setTimeout(() => out.disconnect(), 600);
}
function waltzHud(s) { pastimeHud(`Grace ${s.score}`, `${s.hits} of ${s.steps.length} steps`); }
function waltzStep(s, kind) {
  let st = null, off = .26;
  s.steps.forEach(x => { if (!x.done && Math.abs(x.t - s.time) < off) { off = Math.abs(x.t - s.time); st = x; } });
  if (!st) { s.flow *= .6; return; }   // a stray step between the beats does no harm
  if (st.kind !== kind) {
    st.done = 'miss'; s.streak = 0;
    popup(s, RING_X, TRACK_Y + 62, 'Wrong foot', '#d9cbe6', 20);
    tone([196], .2, 'sine', .04);
  } else {
    const grace = off < .1 ? 3 : 1;
    st.done = 'hit'; s.score += grace; s.hits++; s.streak++; if (grace === 3) s.graceful++;
    s.flow = Math.min(1, s.flow + .55); s.ringPulse = 1;
    popup(s, RING_X, TRACK_Y + 62, grace === 3 ? 'Graceful!' : 'Lovely', grace === 3 ? '#ffe28a' : '#fff3c9');
    if (kind === 'up') { s.twirl = .7; burst(s, s.cx, 330, ['#fff3c9', '#f6c453', '#bcd3ff'], 26, 170, 40); }
    else s.cxTo = clamp(s.cxTo + (kind === 'left' ? -46 : 46), 380, 600);
    tone(kind === 'up' ? [1175, 1480] : [kind === 'left' ? 880 : 988], .18, 'sine', .025, .05);
  }
  waltzHud(s);
}
function keyWaltz(s, e) {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const kind = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ' ': 'up' }[k];
  if (!kind) return false;
  if (!e.repeat) waltzStep(s, kind);
  return true;
}
function updateWaltz(s, dt) {
  if (s.phase === 'play') {
    s.time = s.out ? ac.currentTime - s.t0 : s.time + dt;
    s.steps.forEach(st => {
      if (!st.done && s.time - st.t > .26) { st.done = 'miss'; s.streak = 0; popup(s, RING_X, TRACK_Y + 62, 'Missed step', '#d9cbe6', 20); }
    });
    if (s.time > WALTZ_BARS * 3 * BEAT + .4) finishPastime();
  } else s.time += dt;
  s.flow = Math.max(s.phase === 'play' ? 0 : .3, s.flow - dt * .35);
  s.spin += dt * (.5 + s.flow * 2.4);
  s.twirl = Math.max(0, s.twirl - dt);
  s.ringPulse = Math.max(0, s.ringPulse - dt * 3);
  s.cx += (s.cxTo - s.cx) * Math.min(1, dt * 3);
  if (s.phase === 'play' && Math.abs(s.cx - s.cxTo) < 1) s.cxTo = lerp(s.cxTo, 480, dt * .4);
  stepSparkles(s, dt);
}
function waltzResult(s) {
  const pct = s.score / (s.steps.length * 3);
  const title = pct >= .85 ? 'The belle of the ball' : pct >= .6 ? 'A graceful waltz' : pct >= .3 ? 'A merry dance' : 'Two left feet, and a lot of laughing';
  return { score: s.score, title, text: `Ember danced ${s.hits} of ${s.steps.length} steps, ${s.graceful} of them graceful, for ${s.score} grace.` };
}
// a couple turning round each other: they swap sides as the turn goes round, the nearer one drawn lower and in front
function drawCouple(a, b, cx, y, R, h, angle, moving, twirl) {
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const A = { w: a, x: cx + R * ca, d: sa, h, squash: twirl ? Math.cos(twirl * Math.PI * 4) : 1 };
  const B = { w: b, x: cx - R * ca, d: -sa, h: h * 1.09, squash: 1 };
  A.f = B.x >= A.x ? 1 : -1; B.f = -A.f;
  const frame = w => moving ? Math.floor(angle * 3) % w.frames : 0;
  [A, B].sort((p, q) => p.d - q.d).forEach(p => drawFigure(p.w, p.x, y + p.d * 8, p.h * (1 + p.d * .04), p.f, frame(p.w), p.squash));
}
function renderWaltz(s) {
  ctx.fillStyle = 'rgba(255,214,150,.08)'; ctx.fillRect(0, 0, VW, VH);
  drawCouple(WALKERS[1], WALKERS[2], 210, 478, 38, 150, s.spin * .9 + 2, true, 0);
  drawCouple(emberSheet(), WALKERS[3], s.cx, 528, 54, 250, s.spin, s.flow > .15, s.twirl);
  // the ribbon the steps glide along
  ctx.fillStyle = 'rgba(244,231,201,.86)';
  ctx.beginPath(); ctx.roundRect(110, TRACK_Y - 30, 800, 60, 30); ctx.fill();
  ctx.strokeStyle = 'rgba(167,119,42,.6)'; ctx.lineWidth = 2; ctx.stroke();
  const first = Math.ceil((s.time - 1) / BEAT);
  for (let b = first; b < first + 12; b++) {
    const x = RING_X + (b * BEAT - s.time) * GLIDE;
    if (x < 130 || x > 890) continue;
    ctx.fillStyle = b % 3 ? 'rgba(120,90,50,.25)' : 'rgba(120,90,50,.55)';
    ctx.fillRect(x - 1, TRACK_Y - (b % 3 ? 8 : 16), 2, b % 3 ? 16 : 32);
  }
  const pulse = s.ringPulse;
  ctx.globalCompositeOperation = 'lighter';
  glowDot(RING_X, TRACK_Y, 46 + pulse * 20, `rgba(255,214,120,${.35 + pulse * .4})`);
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = '#c99a3c'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(RING_X, TRACK_Y, 24, 0, 7); ctx.stroke();
  ctx.font = '700 22px "Alegreya Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  s.steps.forEach(st => {
    const x = RING_X + (st.t - s.time) * GLIDE;
    if (x > 900 || x < 120 || st.done === 'hit') return;
    ctx.globalAlpha = st.done ? .35 : 1;
    ctx.fillStyle = st.kind === 'up' ? '#b0476d' : '#2f4f8f';
    ctx.beginPath(); ctx.arc(x, TRACK_Y, 20, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff6df'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff6df'; ctx.fillText(STEP_KEYS[st.kind], x, TRACK_Y + 1);
  });
  ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
}

// ---- lantern festival: light the paper lanterns before they drift away ----
const FESTIVAL_TIME = 60;
function startFestival(s) {
  s.lanterns = []; s.parts = []; s.pops = []; s.lit = 0; s.golden = 0; s.score = 0; s.time = FESTIVAL_TIME;
  s.spawn = .2; s.ex = 480; s.facing = 1; s.dist = 0; s.walking = false; s.next = 10; s.beam = null;
  s.stars = s.stars || Array.from({ length: 60 }, () => ({ x: rand(0, VW), y: rand(0, 150), ph: rand(0, 7) }));
  for (let i = 0; i < 6; i++) s.lanterns.push(newLantern(rand(160, 480)));
  festivalHud(s);
}
function newLantern(y = 575) { return { x: rand(70, 890), y, vy: -rand(30, 48), ph: rand(0, 7), gold: Math.random() < .12, lit: 0 }; }
function festivalHud(s) { pastimeHud(`Lanterns ${s.lit}`, `0:${String(Math.ceil(s.time)).padStart(2, '0')}`.replace('0:60', '1:00')); }
function lightLantern(s, l) {
  l.lit = .01; s.lit++; s.score += l.gold ? 5 : 1; if (l.gold) s.golden++;
  burst(s, l.x, l.y, l.gold ? ['#fff3c9', '#ffd56a'] : ['#ffcf7a', '#ff9a4a'], l.gold ? 20 : 10, 90, 50);
  popup(s, l.x, l.y - 30, l.gold ? '+5 wish!' : '+1', l.gold ? '#ffe28a' : '#fff3c9', l.gold ? 22 : 18);
  tone(l.gold ? [1047, 1319, 1568] : [784 + (s.lit % 5) * 70], .25, 'triangle', .035, .06);
  if (s.lit >= s.next) {   // every ten lanterns, the village sets off a firework
    s.next += 10;
    const fx = rand(200, 760), fy = rand(70, 180), cols = shuffle(['#ff6f91', '#ffd56a', '#8fd3ff', '#c9a7ff', '#9cf29c']).slice(0, 2);
    burst(s, fx, fy, cols, 70, 230, 70);
    tone([392, 523, 659, 784], .5, 'sine', .03, .04);
  }
  festivalHud(s);
}
function updateFestival(s, dt) {
  const play = s.phase === 'play';
  if (play) {
    s.time = Math.max(0, s.time - dt);
    if (s.time === 0) { finishPastime(); festivalHud(s); }
    else if (Math.ceil(s.time) !== Math.ceil(s.time + dt)) festivalHud(s);
    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    s.walking = dir !== 0;
    if (dir) { s.facing = dir; const nx = clamp(s.ex + dir * 280 * dt, 60, 900); s.dist += Math.abs(nx - s.ex); s.ex = nx; }
  }
  if ((s.spawn -= dt) <= 0 && s.phase !== 'done') {
    s.lanterns.push(newLantern());
    s.spawn = rand(.45, .95) * (play ? lerp(1, .65, 1 - s.time / FESTIVAL_TIME) : 1.4);
  }
  s.lanterns.forEach(l => {
    l.y += l.vy * dt * (l.lit ? 1.7 : 1);
    l.x += Math.sin(t * 1.2 + l.ph) * 12 * dt;
    if (l.lit) l.lit = Math.min(1, l.lit + dt * 3);
  });
  s.lanterns = s.lanterns.filter(l => l.y > -60);
  if (s.beam && (s.beam.life -= dt) <= 0) s.beam = null;
  stepSparkles(s, dt);
}
function keyFestival(s, e) {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === 'ArrowLeft' || k === 'a') { keys.left = true; return true; }
  if (k === 'ArrowRight' || k === 'd') { keys.right = true; return true; }
  if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'Enter') {
    if (e.repeat) return true;
    // Ember lights the lowest unlit lantern within reach above her
    let best = null;
    s.lanterns.forEach(l => { if (!l.lit && Math.abs(l.x - s.ex) < 95 && l.y < 450 && l.y > 30 && (!best || l.y > best.y)) best = l; });
    if (best) { s.beam = { x: best.x, y: best.y, life: .3 }; lightLantern(s, best); }
    else s.beam = { x: s.ex + s.facing * 40, y: 300, life: .2, miss: true };
    return true;
  }
  return false;
}
function tapFestival(s, x, y) {
  let best = null, bd = 44;
  s.lanterns.forEach(l => { const d = Math.hypot(l.x - x, l.y - y); if (!l.lit && d < bd) { bd = d; best = l; } });
  if (best) lightLantern(s, best);
}
function festivalResult(s) {
  const title = s.score >= 45 ? 'A sky full of lanterns' : s.score >= 25 ? 'A glowing midsummer night' : s.score >= 10 ? 'A handful of wishes' : 'A quiet evening by the fountain';
  return { score: s.score, title, text: `Ember lit ${s.lit} lantern${s.lit === 1 ? '' : 's'}${s.golden ? `, ${s.golden} of them golden,` : ''} for ${s.score} wishes.` };
}
function renderFestival(s) {
  // the square at dusk
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#4b5291'; ctx.fillRect(0, 0, VW, VH);
  ctx.globalCompositeOperation = 'source-over';
  let g = ctx.createLinearGradient(0, 0, 0, 320);
  g.addColorStop(0, 'rgba(12,14,40,.65)'); g.addColorStop(1, 'rgba(12,14,40,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, 320);
  s.stars.forEach(st => { ctx.fillStyle = `rgba(255,248,225,${reduceMotion ? .6 : .35 + .35 * Math.sin(t * 1.6 + st.ph)})`; ctx.fillRect(st.x, st.y, 1.6, 1.6); });
  // strings of festival lights across the square
  ctx.globalCompositeOperation = 'lighter';
  [[0, 196, 960, 176, 60], [0, 250, 960, 262, 46]].forEach(([x0, y0, x1, y1, sag], row) => {
    ctx.strokeStyle = 'rgba(40,30,20,.6)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); ctx.stroke();
    for (let u = .02; u < 1; u += .04) {
      const x = lerp(x0, x1, u), y = lerp(y0, y1, u) + sag * 4 * u * (1 - u);
      const f = reduceMotion ? 1 : .75 + .25 * Math.sin(t * 3 + u * 40 + row);
      glowDot(x, y + 3, 11, ['rgba(255,190,90,', 'rgba(255,140,160,', 'rgba(255,230,140,'][Math.round(u * 25) % 3] + (.6 * f) + ')');
    }
  });
  glowDot(480, 330, 170, 'rgba(255,170,80,.12)');
  ctx.globalCompositeOperation = 'source-over';
  // friends watching by the fountain
  drawFigure(WALKERS[1], 300, 478, 140, 1);
  drawFigure(WALKERS[2], 650, 476, 168, -1);
  drawFigure(WALKERS[3], 720, 480, 170, -1);
  // lanterns
  s.lanterns.forEach(l => {
    const lit = l.lit, sway = Math.sin(t * 1.2 + l.ph) * .08;
    if (lit) { ctx.globalCompositeOperation = 'lighter'; glowDot(l.x, l.y, 48 * lit, l.gold ? 'rgba(255,220,120,.55)' : 'rgba(255,160,70,.5)'); ctx.globalCompositeOperation = 'source-over'; }
    ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(sway);
    const body = lit ? (l.gold ? '#ffe08a' : '#ffb35c') : (l.gold ? '#d8c38c' : '#e6dccb');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.moveTo(-12, -18); ctx.quadraticCurveTo(-17, 0, -11, 18); ctx.lineTo(11, 18); ctx.quadraticCurveTo(17, 0, 12, -18); ctx.closePath(); ctx.fill();
    if (lit) { const lg = ctx.createRadialGradient(0, 6, 1, 0, 4, 16); lg.addColorStop(0, 'rgba(255,250,220,.95)'); lg.addColorStop(1, 'rgba(255,250,220,0)'); ctx.fillStyle = lg; ctx.fill(); }
    ctx.strokeStyle = lit ? 'rgba(160,80,30,.5)' : 'rgba(110,90,70,.45)'; ctx.lineWidth = 1;
    [-6, 0, 6].forEach(x => { ctx.beginPath(); ctx.moveTo(x * .9, -18); ctx.quadraticCurveTo(x * 1.35, 0, x * .9, 18); ctx.stroke(); });
    ctx.fillStyle = l.gold ? '#a77a2a' : '#8a4b3a';
    ctx.fillRect(-12, -21, 24, 4); ctx.fillRect(-11, 17, 22, 4);
    if (l.gold) { ctx.fillStyle = lit ? '#fffbe6' : '#a77a2a'; ctx.font = '12px serif'; ctx.textAlign = 'center'; ctx.fillText('★', 0, 5); }
    ctx.restore();
  });
  // Ember, with a lit taper
  const w = emberSheet(), frame = s.walking ? Math.floor(s.dist / (CYCLE / w.frames)) % w.frames : 0;
  drawFigure(w, s.ex, 530, 230, s.facing, frame);
  if (s.beam) {
    const hx = s.ex + s.facing * 26, hy = 360;
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = s.beam.miss ? `rgba(255,220,150,${s.beam.life * 1.5})` : `rgba(255,214,120,${s.beam.life * 3})`; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(s.beam.x, s.beam.y); ctx.stroke();
    glowDot(hx, hy, 18, 'rgba(255,214,120,.6)');
    ctx.globalCompositeOperation = 'source-over';
  }
}

// ---- captions ----
let captionText = '';
function caption(text) {
  if (text === captionText) return; captionText = text;
  const el = $('caption');
  if (text) { el.textContent = text; el.classList.add('on'); } else el.classList.remove('on');
}

// ---- controls ----
function buildControls() {
  const box = $('walkers');
  WALKERS.forEach((w, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'walker'; b.id = 'walker-' + i;
    const k = 44 / w.face[2];
    b.innerHTML = `<span class="face" style="background-image:url('${w.img}');background-size:${w.fw * w.frames * k}px ${w.fh * k}px;background-position:${-(w.face[0] * k - 22)}px ${-(w.face[1] * k - 22)}px"></span><span>${w.name}</span><kbd>${i + 1}</kbd>`;
    b.addEventListener('click', () => setLead(i));
    box.appendChild(b);
  });
  [0, 1, 2, 7, 8, 9, 10, 19, 20, 21, 22, 23].forEach(i => {
    const p = PLACES[i];
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'place'; b.textContent = p.name;
    b.dataset.place = i;
    b.addEventListener('click', () => { if (i !== place) travel(i, 'left'); });
    $('places').appendChild(b);
  });
  $('together').addEventListener('change', e => { together = e.target.checked; });
  $('music').checked = musicOn;
  $('music').addEventListener('change', e => setMusic(e.target.checked));
  $('doorBtn').addEventListener('click', useDoor);
  buildAtlas();
  GOWNS.forEach((g, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'gown'; b.id = 'gown-' + i;
    b.setAttribute('aria-pressed', i === gown ? 'true' : 'false');
    b.innerHTML = `<img src="${g.img}" alt=""><span>${g.name}</span><kbd>${i + 1}</kbd>`;
    b.addEventListener('click', () => pickGown(i));
    $('gowns').appendChild(b);
  });
  $('gownName').textContent = GOWNS[gown].name;
  $('dressDone').addEventListener('click', closeDressUp);
  $('dressStart').addEventListener('click', openDressUp);
  buildPastimes();
  $('surpriseGown').addEventListener('click', () => pickGown(gown + 1 + Math.floor(Math.random() * (GOWNS.length - 1))));
  $('saveLook').addEventListener('click', () => {
    // Export a settled scene, even when a gown is still fading in.
    const oldSwap = swapT, oldSparkles = sparkles;
    swapT = 1; sparkles = [];
    ctx.setTransform(K, 0, 0, K, 0, 0);
    renderDressUp();
    canvas.toBlob(blob => {
      if (!blob) { say('Please try saving your picture again.'); return; }
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = `Ember-${GOWNS[gown].name.toLowerCase().replace(/[^a-z]+/g, '-')}.png`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
      say('A keepsake of your lovely gown!');
    }, 'image/png');
    swapT = oldSwap; sparkles = oldSparkles;
  });
}
function setLead(i) {
  if (i === lead) return;
  // the new leader steps to the front; everyone keeps walking the same trail
  walkerState[i].dist = walkerState[lead].dist;
  lead = i;
  document.querySelectorAll('.walker').forEach((b, k) => b.setAttribute('aria-pressed', k === lead ? 'true' : 'false'));
}

// ---- music: Ember's main theme, looping quietly. Browsers only allow sound after the player does something,
// so it starts on the first key press or click. Turning it off is remembered.
const THEME_VOLUME = .45;
const theme = new Audio(encodeURI('Ember Main Theme.mp3'));
theme.loop = true; theme.preload = 'auto'; theme.volume = 0;
let musicOn = true, musicFade = 0;
try { musicOn = localStorage.getItem('realm-music') !== 'off'; } catch (_) {}
function fadeMusic(to) {
  clearInterval(musicFade);
  if (to > 0 && theme.paused) theme.play().catch(() => {});
  musicFade = setInterval(() => {
    theme.volume = Math.max(0, Math.min(THEME_VOLUME, theme.volume + (to > theme.volume ? .03 : -.04)));
    if (Math.abs(theme.volume - to) < .04) { theme.volume = to; clearInterval(musicFade); if (!to) theme.pause(); }
  }, 60);
}
function setMusic(on) {
  musicOn = on; $('music').checked = on;
  try { localStorage.setItem('realm-music', on ? 'on' : 'off'); } catch (_) {}
  const waltzing = pastime && pastime.key === 'waltz';   // the ballroom band plays instead of the theme
  fadeMusic(on && !waltzing ? THEME_VOLUME : 0);
  if (waltzing && pastime.out) pastime.out.gain.value = on ? .9 : 0;
}
['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, function first() {
  ['pointerdown', 'keydown'].forEach(x => removeEventListener(x, first));
  if (musicOn) fadeMusic(THEME_VOLUME);
}));

addEventListener('keydown', e => {
  if ($('mapDialog').open) { if ((e.key === 'g' || e.key === 'G') && !e.repeat) $('mapDialog').close(); return; }   // the map takes the keys while open
  if (e.target.closest && e.target.closest('input,button') && (e.key === ' ' || e.key === 'Enter')) return;
  if ((e.key === 'm' || e.key === 'M') && !e.repeat) { setMusic(!musicOn); return; }
  if (pastime) {
    if (e.key === 'Escape') { if (!e.repeat) closePastime(); }
    else if (!(pastime.phase === 'play' && pastime.def.key(pastime, e))) return;
    e.preventDefault(); return;
  }
  if ((e.key === 'g' || e.key === 'G') && !e.repeat && !dressing) { e.preventDefault(); openMap(); return; }
  if (dressing) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') pickGown(gown - 1);
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') pickGown(gown + 1);
    else if (e.key >= '1' && e.key <= String(GOWNS.length)) pickGown(+e.key - 1);
    else if (['Escape', 'ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S'].includes(e.key)) { if (!e.repeat) closeDressUp(); }
    else return;
    e.preventDefault(); return;
  }
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
  else if (e.key === 'Shift') { keys.hurry = true; return; }
  else if (e.key >= '1' && e.key <= String(WALKERS.length)) { setLead(+e.key - 1); return; }
  else if (e.key === 'e' || e.key === 'E') { if (!e.repeat) talkToResident(); e.preventDefault(); return; }
  else if (e.key === 't' || e.key === 'T') { together = !together; $('together').checked = together; return; }
  else if (['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S'].includes(e.key)) { if (!e.repeat) useDoor(); }
  else return;
  e.preventDefault();
});
addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  if (e.key === 'Shift') keys.hurry = false;
});
addEventListener('blur', () => { keys.left = keys.right = keys.hurry = false; });
function hold(id, on, off) {
  const el = $(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); el.classList.add('held'); on(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, () => { el.classList.remove('held'); off(); }));
}
$('talkBtn').addEventListener('click', talkToResident);
hold('tLeft', () => keys.left = true, () => keys.left = false);
hold('tRight', () => keys.right = true, () => keys.right = false);

// ---- update ----
function update(dt) {
  t += dt;
  // fade between places
  if (fadeDir) {
    fade = clamp(fade + fadeDir * dt / .35, 0, 1);
    if (fadeDir === 1 && fade === 1) { pending(); pending = null; fadeDir = -1; }
    else if (fadeDir === -1 && fade === 0) fadeDir = 0;
  }
  placardT = Math.max(0, placardT - dt);
  $('placard').classList.toggle('on', placardT > .3);
  if (dressing) {
    swapT = Math.min(1, swapT + dt / .35);
    sparkles.forEach(p => { p.age += dt; p.y -= 14 * dt; });
    sparkles = sparkles.filter(p => p.age < p.life);
    return;
  }
  if (pastime) { pastime.def.update(pastime, dt); return; }

  const dir = fadeDir === 1 ? 0 : (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  moving = dir !== 0;
  if (moving) {
    facing = dir;
    leaderX += dir * (keys.hurry ? HURRY : WALK) * dt;
    pushTrail(leaderX, dir);
    if (leaderX > walkHi()) walkOff('right');
    else if (leaderX < walkLo()) walkOff('left');
    leaderX = clamp(leaderX, walkLo() - 14, walkHi() + 14);
  }
  // place each member of the party along the trail
  party().forEach((wi, slot) => {
    const s = walkerState[wi];
    let x, f;
    if (slot === 0) { x = leaderX; f = facing; }
    else { const p = trail[Math.max(0, trail.length - 1 - Math.round(slot * SPACING * sizeAt() / SAMPLE))]; x = clamp(p.x, walkLo() - 14, walkHi() + 14); f = p.f; }
    const dx = x - s.x;
    s.moving = Math.abs(dx) > .01 && Math.abs(dx) < 50;
    if (s.moving) s.dist += Math.abs(dx);
    s.x = x; s.facing = slot === 0 ? f : (Math.abs(dx) > .01 ? Math.sign(dx) : s.facing);
  });

  const target = clamp(leaderX - VW / 2 + facing * 90, 0, worldW - VW);
  camX += (target - camX) * Math.min(1, dt * (reduceMotion ? 20 : 4));

  // what's nearby
  const P = PLACES[place];
  let best = null, bestD = 150;
  P.spots.forEach(([fx, text]) => { const d = Math.abs(leaderX - fx * worldW); if (d < bestD) { bestD = d; best = text; } });
  let near = null, doorDistance = 90;
  (P.doors || []).forEach(dr => { const d = Math.abs(leaderX - dr[0] * worldW); if (d < doorDistance) { doorDistance = d; best = dr[4]; near = dr; } });
  if (fadeDir) near = null;
  if (near !== door) {
    door = near;
    $('doorBtn').hidden = !door;
    if (door) $('doorLabel').textContent = door[3];
  }
  nearbyResident = fadeDir ? null : RESIDENTS.find(r => r.img_ && r.place === place && Math.abs(leaderX - r.x * worldW) < 135) || null;
  $('talkBtn').hidden = !nearbyResident;
  if (nearbyResident) $('talkLabel').textContent = `Talk to ${nearbyResident.name}`;
  if (!nearbyResident) $('speech').classList.remove('on');
  caption(fadeDir ? '' : best || '');

  updateAmbient(dt, P.ambient);
}

// ---- ambient life ----
function updateAmbient(dt, kind) {
  if (reduceMotion) { ambient = []; return; }
  const want = kind === 'birds' ? 5 : kind === 'butterflies' ? 7 : kind === 'motes' ? 26 : 16;
  while (ambient.length < want) {
    const a = { x: camX + Math.random() * VW, y: 0, ph: Math.random() * 7, sp: .6 + Math.random() * .8 };
    if (kind === 'birds') { a.y = 50 + Math.random() * 130; a.vx = 20 + Math.random() * 25; }
    if (kind === 'butterflies') { a.y = 380 + Math.random() * 110; a.vx = (Math.random() - .5) * 30; a.col = ['#f6f1e4', '#f2c14e', '#c9a7e8'][Math.floor(Math.random() * 3)]; }
    if (kind === 'motes') { a.y = 40 + Math.random() * 440; a.vx = (Math.random() - .5) * 8; a.r = .8 + Math.random() * 1.4; }
    if (kind === 'leaves') { a.y = -10 - Math.random() * 400; a.vx = 10 + Math.random() * 20; a.vy = 18 + Math.random() * 22; a.col = ['#cfe07a', '#e9d36a', '#a8c75a'][Math.floor(Math.random() * 3)]; }
    ambient.push(a);
  }
  ambient.forEach(a => {
    a.x += a.vx * dt;
    if (kind === 'butterflies') { a.y += Math.sin(t * 2 * a.sp + a.ph) * 30 * dt; a.x += Math.cos(t * 1.3 + a.ph) * 25 * dt; }
    if (kind === 'motes') { a.y += Math.sin(t * .5 * a.sp + a.ph) * 6 * dt; if (Math.random() < dt * .02) a.dead = true; }
    if (kind === 'leaves') { a.y += a.vy * dt; a.x += Math.sin(t * 2 + a.ph) * 14 * dt; }
    if (a.x < camX - 80 || a.x > camX + VW + 80 || a.y > VH + 20) a.dead = true;
  });
  ambient = ambient.filter(a => !a.dead);
}
function drawAmbient(kind) {
  ambient.forEach(a => {
    const x = a.x - camX;
    if (kind === 'birds') {
      const f = Math.sin(t * 8 * a.sp + a.ph) * 4;
      ctx.strokeStyle = 'rgba(50,60,80,.55)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x - 7, a.y - f); ctx.quadraticCurveTo(x - 3, a.y - 3, x, a.y); ctx.quadraticCurveTo(x + 3, a.y - 3, x + 7, a.y - f); ctx.stroke();
    } else if (kind === 'butterflies') {
      const w = Math.abs(Math.sin(t * 14 * a.sp + a.ph)) * 5 + 1;
      ctx.fillStyle = a.col;
      ctx.beginPath(); ctx.ellipse(x - w / 2, a.y, w / 2 + .5, 4, -.3, 0, 7); ctx.ellipse(x + w / 2, a.y, w / 2 + .5, 4, .3, 0, 7); ctx.fill();
    } else if (kind === 'motes') {
      ctx.fillStyle = `rgba(255,236,170,${.35 + .3 * Math.sin(t * 1.7 * a.sp + a.ph)})`;
      ctx.beginPath(); ctx.arc(x, a.y, a.r, 0, 7); ctx.fill();
    } else {
      ctx.save(); ctx.translate(x, a.y); ctx.rotate(t * a.sp * 2 + a.ph); ctx.fillStyle = a.col; ctx.globalAlpha = .85;
      ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.2, 0, 0, 7); ctx.fill(); ctx.restore();
    }
  });
}

// ---- drawing ----
function drawWalker(wi, depth) {
  const w = wi === 0 ? GOWN_WALKS[gown] : WALKERS[wi], s = walkerState[wi], P = PLACES[place];
  const k = w.h / w.fh * sizeAt() * (1 - depth * .025), x = s.x - camX, y = P.ground - depth * 4;
  if (x < -200 || x > VW + 200) return;
  const frame = s.moving ? Math.floor(s.dist / ((w.cycle || CYCLE) * sizeAt() / w.frames)) % w.frames : 0;
  ctx.fillStyle = 'rgba(30,25,15,.26)';
  ctx.beginPath(); ctx.ellipse(x + s.facing * 4, y, w.fw * k * .36, 8, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(x, y); if (s.facing < 0) ctx.scale(-1, 1);
  ctx.drawImage(w.img_, frame * w.fw, 0, w.fw, w.fh, -w.ax * k, -(w.fh - 2) * k, w.fw * k, w.fh * k);
  ctx.restore();
}

// Dress-up scene: a closer view of the room by the mirror, Lila-Bella in front on the left, Ember centre stage.
const EMBER_X = 600, EMBER_H = 440, EMBER_FEET = 526;
function renderDressUp() {
  const P = PLACES[place], bh = 780, bw = worldW * bh / BG_H;
  ctx.drawImage(P.bgImg, -(.57 * bw - 470), -112, bw, bh);
  const v = ctx.createRadialGradient(480, 300, 160, 480, 300, 620);
  v.addColorStop(0, 'rgba(40,20,8,0)'); v.addColorStop(1, 'rgba(40,20,8,.5)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, VW, VH);

  const k = EMBER_H / GOWN_H;
  ctx.fillStyle = 'rgba(40,22,10,.3)';
  ctx.beginPath(); ctx.ellipse(EMBER_X, EMBER_FEET - 4, 150, 14, 0, 0, 7); ctx.fill();
  const drawGown = (g, alpha) => {
    const im = GOWNS[g].img_;
    ctx.globalAlpha = alpha;
    ctx.drawImage(im, EMBER_X - im.width * k / 2, EMBER_FEET - im.height * k, im.width * k, im.height * k);
    ctx.globalAlpha = 1;
  };
  const e = swapT * swapT * (3 - 2 * swapT);
  if (e < 1) drawGown(prevGown, 1 - e);
  drawGown(gown, e);

  sparkles.forEach(p => {
    const f = p.age / p.life, r = p.sz * Math.sin(f * Math.PI);
    ctx.fillStyle = `rgba(255,${230 + (p.sz | 0) * 3},170,${1 - f})`;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - r); ctx.quadraticCurveTo(p.x, p.y, p.x + r, p.y); ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + r);
    ctx.quadraticCurveTo(p.x, p.y, p.x - r, p.y); ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - r); ctx.fill();
  });

  const L = LILA_FRONT.img_, lk = 410 / L.height;
  ctx.drawImage(L, 215 - L.width * lk / 2, 556 - L.height * lk, L.width * lk, L.height * lk);
}

function render() {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  if (dressing) { renderDressUp(); drawFade(); return; }
  if (pastime) { renderPastime(); drawFade(); return; }
  const P = PLACES[place];
  ctx.drawImage(P.bgImg, -camX, P.yoff, worldW, BG_H * (P.zoom || 1));
  if (P.ambient === 'birds') drawAmbient('birds');

  for (const resident of RESIDENTS.filter(r => r.img_ && r.place === place)) {
    const height = resident.h * sizeAt(), width = resident.img_.width * height / resident.img_.height;
    const x = resident.x * worldW - camX;
    ctx.drawImage(resident.img_, x - width / 2, P.ground - height, width, height);
    ctx.save(); ctx.font = '16px "Alegreya Sans", sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#31443b'; ctx.lineWidth = 3;
    ctx.strokeText(resident.name, x, P.ground - height - 9); ctx.fillText(resident.name, x, P.ground - height - 9); ctx.restore();
  }

  // the party: last in line drawn first so the leader is in front
  const order = together ? party() : [lead];
  for (let slot = order.length - 1; slot >= 0; slot--) drawWalker(order[slot], slot);

  if (P.ambient !== 'birds') drawAmbient(P.ambient);

  drawFade();
}
function drawFade() {
  if (fade > 0) { ctx.fillStyle = `rgba(12,16,18,${fade})`; ctx.fillRect(0, 0, VW, VH); }
}

// ---- loop ----
let last = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  update(dt); render();
  requestAnimationFrame(frame);
}
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not load ' + src)); i.src = src; }); }

(async () => {
  resize();
  buildControls();
  try { await Promise.race([document.fonts.load('19px "IM Fell English"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  try { await Promise.all([
    ...RESIDENTS.map(async r => { try { r.img_ = await loadImg(r.img); } catch { r.img_ = null; } }),
    ...PLACES.map(async p => { p.bgImg = await loadImg(p.img); }),
    ...WALKERS.map(async w => { w.img_ = await loadImg(w.img); }),
    ...GOWN_WALKS.slice(1).map(async w => { w.img_ = await loadImg(w.img); }),
    ...[...GOWNS, LILA_FRONT].map(async g => { g.img_ = await loadImg(g.img); }),
  ]); } catch (error) {
    $('loadStatus').textContent = `${error.message}. Refresh to try again.`;
    return;
  }
  $('loadStatus').hidden = true;
  $('dressStart').disabled = false;
  document.querySelectorAll('#pastimes .place').forEach(b => { b.disabled = false; });
  document.querySelectorAll('.walker').forEach((b, k) => b.setAttribute('aria-pressed', k === lead ? 'true' : 'false'));
  enterPlace(0, 'left');
  leaderX = 260; resetTrail(leaderX, 1);
  party().forEach((wi, slot) => { walkerState[wi].x = leaderX - slot * SPACING; });
  camX = 0;
  requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
})();
})();
