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
      [.64, 'play', 'garden', 'Tend the royal gardens', 'The royal rose gardens bloom along the castle path. Old Bramble the gardener could use a hand.'],
      [.86, 8, .8, 'Enter the castle', 'The open castle gate leads into the sage-green dove hall.']] },
  { name: 'Lavender Fields', img: 'lavender-fields.jpg', yoff: -56, ground: 492, ambient: 'butterflies',
    spots: [[.09, 'A dry-stone wall and an old fence mark the edge of the fields.'], [.37, 'Far off, a little castle sits on the lake shore.'], [.75, 'The village rooftops rise beyond the lavender. A path leads to the market square.']],
    doors: [[.82, 7, .06, 'Visit Lavender Village', 'Follow the lavender-lined path into the village market square.'],
      [.22, 'play', 'horses', 'Visit Annalise’s horses', 'Annalise’s horses graze in the paddock beside the old fence.'],
      [.55, 'play', 'festival', 'Join the Lavender Festival', 'Bunting and music: the Lavender Festival is under way in the fields.']] },
  { name: 'Aspen Meadow', img: 'aspen-meadow.jpg', yoff: -36, ground: 500, ambient: 'leaves',
    spots: [[.1, 'White aspens whisper in the breeze.'], [.52, 'A mountain lake glitters between the pines.']],
    doors: [[.73, 3, .51, 'Climb into the treehouse', 'A treehouse with a spiral stair winds up the great tree.'],
      [.58, 'play', 'treehouse', 'Play at the treehouse', 'Berry bushes, shy woodland animals and games among the aspens around the treehouse.']] },
  // Treehouse rooms (`inside` = the outdoor place they belong to). Their edges are walls unless `left`/`right` names a room.
// Downstairs is the kitchen; upstairs the three bedrooms run in a row: Rose | Loft | Mountain.
  { name: 'Kitchen', inside: 2, img: 'treehouse-kitchen.jpg', yoff: -50, ground: 534, scale: 2.05, ambient: 'motes',
    spots: [[.2, 'Bread and flowers wait on the long kitchen table.'], [.88, 'Cushions heaped on a sofa by the window.']],
    doors: [[.51, 2, .73, 'Go back outside', 'The front door opens onto the spiral stair.'], [.7, 5, .9, 'Climb the stairs', 'The stairs wind up around the trunk.'],
      [.18, 'play', 'kitchen', 'Bake, cook & plan a picnic', 'Evelynn has set out flour, butter and the picnic basket on the long kitchen table.']] },
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
      [.93, 'The haberdasher has ribbons, buttons, spools of thread and hats for sale.']],
    doors: [[.03, 1, .82, 'Return to Lavender Fields', 'The path back to the lavender fields starts at the edge of the square.'],
      [.1, 'play', 'carpenter', 'Visit the carpenter’s shop', 'Master Tobias the carpenter waves you into his workshop.'],
      [.44, 'play', 'stage', 'Star in a village play', 'A little stage stands beside the fountain. The players are looking for a leading lady.'],
      [.63, 'play', 'dress', 'Make a dress at the dress shop', 'Madame Rosalind’s dress shop is full of silks and ruffles.'],
      [.88, 'play', 'haberdashery', 'Visit the haberdashery', 'Ribbons, buttons and hats fill Mr Penrose’s haberdashery.'],
      [.96, 17, .06, 'Continue along the village street', 'The village continues to the right, past the inn, bookshop and café.']] },
  { name: 'Castle Hall', inside: 0, area: 'inside the castle', img: 'castle-hall.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'motes', left: 9,
    spots: [[.03, 'The ballroom lies to the left, through the grand archway.'], [.25, 'Sage-green tapestries and white dove banners hang above cushioned benches.'],
      [.5, 'A sweeping staircase rises beneath the great arched window.'], [.73, 'Polished armour stands guard beside the castle doors.']],
    doors: [[.1, 9, .9, 'Go left into the ballroom', 'The left archway opens into the royal ballroom.'],
      [.5, 10, .5, 'Go up the grand staircase', 'Climb the grand staircase to the landing and the two upstairs corridors.'],
      [.3, 'play', 'royal-kitchen', 'Help in the royal kitchens', 'A servants’ door beside the benches leads down to the royal kitchens.'],
      [.8, 0, .86, 'Return to Castle Valley', 'The castle doors lead back out into the valley.']] },
  { name: 'Royal Ballroom', inside: 0, area: 'inside the castle', img: 'castle-ballroom.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'motes', right: 8,
    spots: [[.08, 'A grand piano waits beside the fireplace.'], [.3, 'Crystal chandeliers scatter golden light across the marble.'],
      [.5, 'The wide dance floor shines beneath the blue-and-gold banners.'], [.75, 'Tall windows look over the lake and distant mountains.'],
      [.96, 'The castle hall is through the archway on the right.']],
    doors: [[.9, 8, .1, 'Go right to the castle hall', 'Return through the right archway to the castle hall.'],
      [.5, 'play', 'royal-event', 'Host a royal event', 'The ballroom is yours to fill with music, candles and guests.']] },
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
    doors: [[.03, 7, .94, 'Return to the market square', 'The first village square is back along the street to the left.'],
      [.11, 'play', 'shoes', 'Visit the shoe shop', 'Wren the shoemaker has slippers, dancing shoes and boots.'],
      [.26, 'play', 'toys', 'Visit the toy shop', 'Mrs Pip’s toy shop is full of teddies, kites and music boxes.'],
      [.42, 'play', 'books', 'Browse the bookshop', 'Mabel the bookseller can find you the perfect book.']] },
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
  // ---- Byzantine: Cashamir's villa on the lake (painted in code by paintVilla, below) ----
  { name: 'Byzantine · The Villa', inside: 'byzantine', area: 'in Byzantine', paint: () => paintVilla(), img: 'villa', yoff: -30, ground: 506, scale: .9, ambient: 'birds',
    spots: [[.04, 'Cypress trees line the shore of the villa lake.'], [.3, 'Peacocks strut through the villa farm.'], [.5, 'Golden mosaics glitter beneath the villa’s great dome.'],
      [.66, 'Lanterns are strung across the courtyard for dancing.'], [.82, 'Piano music drifts from the music room window.']],
    doors: [[.12, 'play', 'boating', 'Go boating on the lake', 'A little sailboat is tied up at the villa dock.'],
      [.33, 'play', 'villa-animals', 'Care for the animals', 'Peacocks, goats, ducklings, a lamb and a bunny live on the villa farm.'],
      [.6, 'play', 'villa-dance', 'Dance in the courtyard', 'Musicians play beneath the lanterns in the marble courtyard.'],
      [.78, 'play', 'villa-piano', 'Watch Cashamir play piano', 'Cashamir, the icy-blue prince, is at the piano in the music room.'],
      [.52, 23, .46, 'Step inside the villa', 'Through the arcade, tall glass doors open into the villa’s golden foyer.'],
      [.95, 0, .1, 'Take the road home', 'The road home leads back to Castle Valley and Ember’s land.']] },
  // ---- inside Cashamir's villa: the photographed rooms, entered through the doors in the arcade ----
  { name: 'Byzantine · Villa Foyer', inside: 'byzantine', area: 'inside the villa', img: 'byzantine-foyer.jpg', yoff: -30, ground: 520, walk: [0, .64], scale: 1.15, ambient: 'motes',   // stops at the foot of the staircase
    spots: [[.08, 'A landscape painting and a vase of white lilies on a gilded console table.'], [.32, 'An olive tree in a stone urn, beside the arches.'],
      [.45, 'A marble compass rose is set into the floor beneath the crystal chandelier.'], [.58, 'Lamplit arches lead deeper into the villa.'],
      [.62, 'A sweeping marble staircase curves up to the gallery, and tall windows fill the hall with mountain sunlight.']],
    doors: [[.45, 22, .52, 'Out to the villa courtyard', 'The glass doors open back out onto the arcade.'],
      [.58, 24, .05, 'Through the arches to the hallway', 'Beyond the lamplit arches, a long sunny hallway runs through the villa.']] },
  // the villa's hallways run left to right: first the hallway of doors, then the hallway of windows
  { name: 'Byzantine · Hallway of Doors', inside: 'byzantine', area: 'inside the villa', img: 'byzantine-hall-doors.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'motes',
    leftExit: [23, .58], right: 25,
    spots: [[.12, 'A carved double door. It’s locked.'], [.3, 'Through the tall window, the lake glitters between the cypresses.'],
      [.69, 'An olive tree in a stone urn stands between the windows.']],
    doors: [[.49, 26, .1, 'Open the library doors', 'The middle doors open onto the villa library, with its white grand piano.'],
      [.87, 28, .08, 'Into the dining room', 'The right-hand doors open onto the long dining room, set for a feast.']] },
  { name: 'Byzantine · Hallway of Windows', inside: 'byzantine', area: 'inside the villa', img: 'byzantine-hall-windows.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'motes',
    left: 24, right: 27,
    spots: [[.14, 'Sunlight pours through the arched windows onto a cushioned bench.'], [.5, 'A painting of the mountains hangs above white lilies on a gilded table.'],
      [.68, 'The windows look out over the lake and the snowy peaks.'], [.9, 'At the end of the hallway, music drifts from the ballroom.']] },
  { name: 'Byzantine · Villa Library', inside: 'byzantine', area: 'inside the villa', img: 'byzantine-library.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'motes',
    spots: [[.12, 'A rolling ladder leans against shelves of leather-bound books.'], [.27, 'An armchair and a little table wait beside a vase of lilies.'],
      [.4, 'A window seat looks out to the snowy mountains.'], [.68, 'A white grand piano stands open, its music ready on the stand.'], [.9, 'More shelves climb to the ceiling, packed with books.']],
    doors: [[.05, 24, .49, 'Back to the hallway', 'The library doors lead back to the hallway of doors.']] },
  // the ballroom's twin staircases frame the floor, so the party walks between them; the centre doors open onto the balcony
  { name: 'Byzantine · Ballroom', inside: 'byzantine', area: 'inside the villa', img: 'byzantine-ballroom.jpg', yoff: -30, ground: 520, walk: [.2, .8], scale: 1.15, ambient: 'motes',
    left: 25,
    spots: [[.24, 'A sweeping staircase curves up to the gallery.'], [.33, 'A gilded mirror and a little table stand between the arches.'],
      [.5, 'A crystal chandelier hangs above an inlaid marble rose.'], [.76, 'The twin staircase climbs the other side of the ballroom.']],
    doors: [[.5, 29, .5, 'Out to the balcony', 'The tall glass doors open onto a balcony high above the lake.']] },
  { name: 'Byzantine · Dining Room', inside: 'byzantine', area: 'inside the villa', img: 'byzantine-dining.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'motes',
    spots: [[.12, 'A carved sideboard holds a bowl of lemons and white lilies.'], [.35, 'Tall windows look out on the lake and the mountains.'],
      [.5, 'The long table is set with candelabra and a great bowl of lilies.'], [.86, 'An olive tree stands beside the crackling fireplace.'], [.95, 'Candles flicker beneath a gilded mirror over the mantel.']],
    doors: [[.04, 24, .87, 'Back to the hallway', 'The dining room doors lead back to the hallway of doors.']] },
  { name: 'Byzantine · Balcony', inside: 'byzantine', area: 'inside the villa', img: 'byzantine-balcony.jpg', yoff: -30, ground: 520, scale: 1.15, ambient: 'butterflies',
    spots: [[.15, 'White blossom hangs from the branches over the balustrade.'], [.5, 'Snowy mountains rise above the shining lake.'], [.83, 'Stone urns spill over with white flowers.']],
    doors: [[.5, 27, .5, 'Back into the ballroom', 'The glass doors lead back into the ballroom.']] },
];
const VILLA = PLACES.findIndex(p => p.name === 'Byzantine · The Villa');   // 22; the villa's interior rooms follow it
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
  if (!nearbyResident || dressing || fadeDir || playing()) return;
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
  if (door[1] === 'dress') openDressUp();
  else if (door[1] === 'play') openPlay(door[2]);
  else travel(door[1], door[2]);
}
function travel(i, from) { fadeTo(() => enterPlace(i, from)); }
// ---- games (activities.js): baking with Evelynn, village shops, the royal gardens, Byzantine's villa… ----
const playing = () => !!window.EmberActivities?.isOpen();
function openPlay(key) {
  if (!window.EmberActivities || playing()) return;
  keys.left = keys.right = keys.hurry = false;
  window.EmberActivities.open(key, {
    duck: on => fadeMusic(on || !musicOn ? 0 : THEME_VOLUME),   // the theme hushes while the piano or dance music plays
    onClose: () => $('doorBtn').hidden || $('doorBtn').focus({ preventScroll: true }),
  });
}

// ---- Byzantine villa: painted in code (2172x724, the same size as the painted places) ----
// Left to right: the lake and dock, the villa farm, the domed villa with its lantern courtyard, the music room, the road home.
function paintVilla() {
  const W = 2172, H = 724, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const grad = (y0, y1, stops) => { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, col]) => gr.addColorStop(o, col)); return gr; };
  const poly = (pts, fill) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fillStyle = fill; g.fill(); };
  const arch = (x, y, w, h, fill) => { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.fillStyle = fill; g.fill(); };
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // sky, sun and far mountains
  g.fillStyle = grad(0, 520, [[0, '#8cbfe0'], [.6, '#f2dcc0'], [1, '#f7c99a']]); g.fillRect(0, 0, W, H);
  const sun = g.createRadialGradient(420, 150, 10, 420, 150, 260); sun.addColorStop(0, 'rgba(255,248,220,.95)'); sun.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = sun; g.fillRect(0, 0, W, 500);
  poly([[0, 420], [160, 300], [330, 360], [520, 270], [760, 380], [980, 310], [1240, 390], [1500, 300], [1760, 370], [2000, 290], [2172, 350], [2172, 470], [0, 470]], '#b9aacb');
  poly([[0, 450], [240, 380], [470, 430], [700, 390], [960, 450], [1300, 420], [1700, 440], [2172, 410], [2172, 500], [0, 500]], '#8fae86');
  // the lake, left
  g.fillStyle = grad(440, 610, [[0, '#7fb3cf'], [1, '#3f7ea6']]); g.fillRect(0, 445, 760, 165);
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2;
  for (let i = 0; i < 40; i++) { const x = rnd() * 720, y = 460 + rnd() * 140, w = 20 + rnd() * 40; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.stroke(); }
  // sailboat and dock
  g.fillStyle = '#7a4b2c'; g.beginPath(); g.moveTo(170, 560); g.lineTo(320, 560); g.lineTo(295, 585); g.lineTo(195, 585); g.closePath(); g.fill();
  g.fillStyle = '#5a3a24'; g.fillRect(243, 420, 6, 142);
  poly([[250, 425], [250, 552], [330, 552]], '#fffaf0'); poly([[242, 440], [242, 552], [190, 552]], '#e8eef5');
  g.fillStyle = '#9a6a42'; g.fillRect(300, 596, 300, 18);
  g.fillStyle = '#6e4a2e'; for (let x = 310; x < 600; x += 48) g.fillRect(x, 596, 8, 50);
  // cypresses
  const cypress = (x, y, h) => { g.fillStyle = '#2f4f33'; g.beginPath(); g.ellipse(x, y - h / 2, h * .13, h / 2, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.ellipse(x - h * .04, y - h / 2, h * .05, h * .45, 0, 0, 7); g.fill(); };
  [[40, 610, 300], [110, 600, 240], [690, 590, 260], [990, 600, 300], [1890, 600, 280], [1960, 610, 220]].forEach(a => cypress(...a));
  // the villa farm: a little stone barn, fence and hay
  g.fillStyle = '#e6d3b0'; g.fillRect(760, 440, 230, 160);
  poly([[740, 445], [875, 370], [1010, 445]], '#c46a45');
  g.fillStyle = '#7a4b2c'; arch(845, 500, 60, 100, '#7a4b2c');
  g.fillStyle = '#e8c36a'; g.fillRect(780, 560, 50, 40); g.fillRect(930, 565, 46, 35);
  g.strokeStyle = '#8a6440'; g.lineWidth = 7;
  g.beginPath(); g.moveTo(700, 590); g.lineTo(1040, 590); g.moveTo(700, 615); g.lineTo(1040, 615); g.stroke();
  g.fillStyle = '#7a5434'; for (let x = 700; x <= 1040; x += 57) g.fillRect(x - 5, 575, 10, 55);
  // the villa: cream walls, terracotta roofs, golden dome
  const wall = '#f1e4c9', shade = 'rgba(120,90,50,.12)';
  g.fillStyle = wall; g.fillRect(1080, 330, 760, 280);
  poly([[1060, 336], [1460, 268], [1860, 336]], '#c46a45');
  // the dome over the centre
  g.fillStyle = wall; g.fillRect(1380, 210, 160, 90);
  for (let i = 0; i < 4; i++) arch(1395 + i * 36, 228, 22, 50, '#3f6a95');
  const dome = g.createRadialGradient(1440, 120, 10, 1460, 180, 120); dome.addColorStop(0, '#fff2b8'); dome.addColorStop(.5, '#e2b24e'); dome.addColorStop(1, '#a8772c');
  g.fillStyle = dome; g.beginPath(); g.ellipse(1460, 212, 92, 96, 0, Math.PI, 0); g.fill();
  g.strokeStyle = 'rgba(120,80,20,.45)'; g.lineWidth = 2;
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(1460, 118); g.quadraticCurveTo(1460 + i * 34, 140, 1460 + i * 29, 212); g.stroke(); }
  g.fillStyle = '#e2b24e'; g.fillRect(1456, 92, 8, 28); g.beginPath(); g.arc(1460, 90, 7, 0, 7); g.fill();
  // mosaic band under the eaves
  for (let x = 1080; x < 1840; x += 16) { g.fillStyle = (x / 16) % 2 ? '#2f5f9a' : '#e2b24e'; g.fillRect(x, 340, 16, 12); }
  // upper windows
  for (let x = 1120; x < 1820; x += 80) { if (x > 1360 && x < 1540) continue; arch(x, 368, 34, 60, '#3a5f86'); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 4, 390, 6, 34); }
  // the courtyard arcade (lanterns strung across) and the music room's great window
  g.fillStyle = shade; g.fillRect(1080, 450, 760, 160);
  for (let i = 0; i < 6; i++) { arch(1100 + i * 66, 470, 50, 140, '#d9c39e'); g.fillStyle = '#f7ecd4'; g.fillRect(1094 + i * 66, 462, 8, 148); }
  g.fillStyle = '#f7ecd4'; g.fillRect(1490, 462, 8, 148);
  arch(1560, 440, 220, 170, '#2a3d58');
  g.fillStyle = '#9fd0ee'; g.globalAlpha = .55; g.fillRect(1560, 470, 30, 140); g.fillRect(1750, 470, 30, 140); g.globalAlpha = 1;
  // the piano: a grand piano silhouette in the window
  g.fillStyle = '#141018'; g.beginPath(); g.moveTo(1600, 540); g.lineTo(1720, 540); g.quadraticCurveTo(1750, 545, 1745, 565); g.lineTo(1600, 566); g.closePath(); g.fill();
  g.fillRect(1612, 566, 8, 40); g.fillRect(1730, 566, 8, 40); g.fillRect(1640, 508, 6, 34);
  g.fillStyle = '#fffaf0'; g.fillRect(1604, 560, 70, 5);
  g.strokeStyle = '#2f5f9a'; g.lineWidth = 10; g.beginPath(); g.moveTo(1560, 470); g.quadraticCurveTo(1590, 520, 1575, 610); g.moveTo(1780, 470); g.quadraticCurveTo(1750, 520, 1765, 610); g.stroke();
  // lantern strings over the courtyard
  g.strokeStyle = '#6e5a3e'; g.lineWidth = 2;
  for (const [x0, x1] of [[1080, 1300], [1290, 1520]]) {
    g.beginPath(); g.moveTo(x0, 470); g.quadraticCurveTo((x0 + x1) / 2, 530, x1, 470); g.stroke();
    for (let k = 1; k < 7; k++) { const t = k / 7, x = x0 + (x1 - x0) * t, y = 470 + 120 * t * (1 - t);
      const lg = g.createRadialGradient(x, y + 10, 1, x, y + 10, 22); lg.addColorStop(0, 'rgba(255,230,150,.9)'); lg.addColorStop(1, 'rgba(255,220,130,0)');
      g.fillStyle = lg; g.fillRect(x - 22, y - 12, 44, 44); g.fillStyle = '#f2b84e'; g.beginPath(); g.ellipse(x, y + 10, 6, 9, 0, 0, 7); g.fill(); }
  }
  // the road home, right
  poly([[1960, 610], [2172, 560], [2172, 610]], '#d6bd8e');
  g.fillStyle = '#7a5434'; g.fillRect(2060, 520, 8, 90); g.fillStyle = '#9a6a42'; g.fillRect(2030, 525, 90, 22);
  // the marble terrace along the front, with potted lemon trees
  g.fillStyle = grad(600, H, [[0, '#efe4d0'], [1, '#d8c7a6']]); g.fillRect(0, 606, W, H - 606);
  g.strokeStyle = 'rgba(140,110,70,.25)'; g.lineWidth = 2;
  for (let y = 630; y < H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  for (let x = 0; x < W; x += 64) { g.beginPath(); g.moveTo(x, 606); g.lineTo(x - 40, H); g.stroke(); }
  g.fillStyle = '#e2b24e'; g.fillRect(0, 604, W, 5);
  for (const x of [640, 1060, 1860]) {
    g.fillStyle = '#b8643e'; poly([[x - 26, 600], [x + 26, 600], [x + 18, 640], [x - 18, 640]], '#b8643e');
    g.fillStyle = '#5f8a3e'; g.beginPath(); g.arc(x, 560, 40, 0, 7); g.fill();
    g.fillStyle = '#f2d64e'; for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(x - 28 + rnd() * 56, 535 + rnd() * 50, 5, 0, 7); g.fill(); }
  }
  return c;
}

// ---- the atlas: Xanthe's Celadonia. Click a land to travel there (lands with no places yet can't be visited).
// x, y: centre of the land's painted name, w, h: the clickable box, all as fractions of the map image.
const LANDS = [
  { key: 'celadonia', name: 'Celadonia', x: .79, y: .274, w: .19, h: .07, to: [0, .5], note: 'Ember’s home' },
  { key: 'azurea', name: 'Azurea', x: .069, y: .72, w: .15, h: .07, to: [19, .5], note: 'The blue land' },
  { key: 'xanthe', name: 'Xanthe', x: .1, y: .176, w: .16, h: .07 },
  { key: 'byzantine', name: 'Byzantine', x: .13, y: .915, w: .17, h: .07, to: [VILLA, .5], note: 'Cashamir’s villa on the lake' },
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
  if (dressing || fadeDir || $('mapDialog').open || playing()) return;
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
  [0, 1, 2, 7, 8, 9, 10, 19, 20, 21, VILLA].forEach(i => {
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
  fadeMusic(on ? THEME_VOLUME : 0);
}
['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, function first() {
  ['pointerdown', 'keydown'].forEach(x => removeEventListener(x, first));
  if (musicOn) fadeMusic(THEME_VOLUME);
}));

addEventListener('keydown', e => {
  if (playing()) return;   // the games dialog has its own keys
  if ($('mapDialog').open) { if ((e.key === 'g' || e.key === 'G') && !e.repeat) $('mapDialog').close(); return; }   // the map takes the keys while open
  if (e.target.closest && e.target.closest('input,button') && (e.key === ' ' || e.key === 'Enter')) return;
  if ((e.key === 'm' || e.key === 'M') && !e.repeat) { setMusic(!musicOn); return; }
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
    ...PLACES.map(async p => { p.bgImg = p.paint ? p.paint() : await loadImg(p.img); }),
    ...WALKERS.map(async w => { w.img_ = await loadImg(w.img); }),
    ...GOWN_WALKS.slice(1).map(async w => { w.img_ = await loadImg(w.img); }),
    ...[...GOWNS, LILA_FRONT].map(async g => { g.img_ = await loadImg(g.img); }),
  ]); } catch (error) {
    $('loadStatus').textContent = `${error.message}. Refresh to try again.`;
    return;
  }
  $('loadStatus').hidden = true;
  $('dressStart').disabled = false;
  document.querySelectorAll('.walker').forEach((b, k) => b.setAttribute('aria-pressed', k === lead ? 'true' : 'false'));
  enterPlace(0, 'left');
  leaderX = 260; resetTrail(leaderX, 1);
  party().forEach((wi, slot) => { walkerState[wi].x = leaderX - slot * SPACING; });
  camX = 0;
  requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
})();
})();
