// The Soulmates treasure hunt, which starts once the intro is over.
//
// There are three hidden levels, one per villain. The player never sees "level 1/2/3", only the treasures found so far.
//   level 0: Goldtooth (+ Cutlass's former crews)       easiest
//   level 1: Evangeline (+ girl pirates + allies)       medium
//   level 2: The Pirate King (+ his crews + those in servitude)   hardest
//
// Every event has a kind:
//   'plot'  (◇ in the notebook)  triggered by the story. Plot events in a level happen in the order listed here.
//           The one marked `final` wins that level's treasure, and it waits until everything else in the level is done.
//   'crew'  (no ◇)               a crewmate (`from`) comes up with an idea at some point while you explore, one at a time.
//   'heart' (♡)                  a new edition of characters: someone new joins (`unlock` = their crew key, if they have art).
// Other fields:
//   requires: event ids that must be done first.
//   goto: a room on the ship the player must walk to before the episode opens.
//   bg: a room key (its painting is the backdrop) or a theme: ballroom, town, jungle, river, sea, night, rival, chapel, eastern, temple.
//   cast: who stands in the scene (crew keys). Speakers are matched by name.
//   beats: [{ text (narration), lines (dialogue 'Speaker: “…”'), choices: [{ label, score, reply: [lines] }] }]
//   ends: [[min score, text], …] (the highest one reached is used). pass: the score needed to succeed, or the player retries (failText).
//   play: { href, label } opens one of the existing mini-games after the scene. back: the caption shown on returning to the ship.
//   item: the index of the treasure this event wins.
window.SOULMATES_QUEST = {
  // PLACEHOLDER NAMES: rename these freely
  treasures: [
    { name: 'The Sun Compass', icon: '☼', text: 'A brass compass that points to whatever its holder has lost. Goldtooth wore it around his neck.' },
    { name: 'The Siren’s Pearl', icon: '◉', text: 'A pearl that glows like moonlight. Evangeline sank it rather than let anyone else have it.' },
    { name: 'The Dragon Seal', icon: '✦', text: 'A carved jade seal. Whoever holds it commands the Pirate King’s fleet.' },
  ],
  // what the ship's log says while you hunt (one per hidden level; never names the level)
  rumours: [
    'Word on the docks: Goldtooth has something around his neck that doesn’t belong to him.',
    'Word on the waves: a captain named Evangeline wants the treasures, and her girls never miss.',
    'Word from the east: a Pirate King rules the far seas, and nobody who sails against him comes home.',
    'All three treasures are aboard. Whatever they unlock, the two captains will find it together.',
  ],
  events: [
    // ================= LEVEL 0 · GOLDTOOTH =================
    { id: 'crispin', level: 0, kind: 'heart', title: 'A Lord Below Decks', unlock: 'crispin', goto: 'hall', bg: 'hall',
      hook: 'Thump. Thump. Something below decks keeps knocking, and Cutlass’s boys keep saying it’s “just the barrels.”',
      gotoHint: 'Follow the thumping down to the Cabin Hall below decks.',
      cast: ['ruby', 'cutlass', 'absalom'],
      beats: [
        { place: { absalom: .84 }, approach: 'absalom', goal: 'The thumping comes from the end of the hall. Walk down to Absalom, who is leaning on a cabin door.',
          text: 'The thumping is loudest at the end of the hall. Absalom is leaning against a cabin door, whistling far too innocently.',
          lines: ['Absalom: “Nothing in there, Captain. Just barrels. Very lively barrels.”', 'Ruby: “Barrels don’t hum sea shanties off-key, Absalom.”'],
          choices: [
            { label: 'Order him aside', score: 2, reply: ['Ruby: “Step aside. Now.”', 'Absalom: “Aye aye, Captain…”'] },
            { label: 'Ask Cutlass to handle his boy', score: 2, reply: ['Cutlass: “Absalom. Door. Open it.”', 'Absalom: “You never let me keep anything.”'] },
            { label: 'Bribe him with Odessa’s pie', score: 1, reply: ['Absalom: “…Is it the cherry one?”', 'He steps aside, already drooling.'] },
          ] },
        { room: 'bedroom', at: .12, cast: ['absalom', 'crispin'], place: { absalom: .42, crispin: .74 }, approach: 'crispin', goal: 'Absalom opens the door. Someone is tied up by the window. Go to him.',
          text: 'Inside the bedchamber, a young man in a velvet coat is tied to a chair, gagged with sailcloth. His boots are polished. His glare could sink a ship.',
          lines: ['Crispin: “Mmmph! MMPH!”', 'Absalom: “He was standing on the dock looking so lonely, Cap’n. I thought he’d make a fine shipmate!”'],
          choices: [
            { label: 'Untie him gently', score: 2, reply: ['Ruby loosens the ropes, one knot at a time.', 'Crispin: “…Thank you. I suppose.”'] },
            { label: 'Take the gag off first', score: 1, reply: ['Crispin: “Outrageous! Barbaric! I am LORD Crispin and I will see you all hanged!”', 'Ruby: “Perhaps the gag could go back on.”'] },
            { label: 'Let Cutlass cut him loose', score: 1, reply: ['Cutlass slices the ropes with one flourish. Also one of Crispin’s coat buttons.', 'Crispin: “That was SILK.”'] },
          ] },
        { text: 'Crispin rubs his wrists and looks around the cabin as if it were a pigsty.', cast: ['crispin'], place: { crispin: .6 },
          lines: ['Crispin: “I despise ships. I despise the sea. I especially despise pirates.”', 'Cutlass: “Then you’ve picked a terrible place to be kidnapped.”', 'Ruby: “You can go ashore at the next port… or stay for supper.”', 'Crispin: “…What is for supper?”'],
          choices: [
            { label: 'Promise him Odessa’s cooking', score: 2, reply: ['Crispin: “Fine. One meal. Then I leave.”', 'He does not leave.'] },
            { label: 'Offer him a cabin with a real bed', score: 2, reply: ['Crispin: “With clean sheets? …I will consider it.”'] },
            { label: 'Tell him the crew will grow on him', score: 1, reply: ['Crispin: “Like barnacles, I suppose.”'] },
          ] },
      ],
      ends: [[0, 'Lord Crispin is aboard. He hates everything about sailing and pirates. But well… he’ll change his mind soon enough.']] },

    { id: 'ball', level: 0, kind: 'plot', title: 'Ball Chaos', bg: 'ballroom', cast: ['ruby', 'cutlass', 'jade', 'hazel'],
      hook: 'A letter sealed in gold wax: Captain Ruby is to host the royal ball. Every royal guest is whispering one name. Goldtooth.',
      beats: [
        { text: 'The rumour says Goldtooth carries the first of three treasures, and that he’ll slip in among the guests tonight.',
          lines: ['Ruby: “If Goldtooth shows his face, I want him so busy he forgets his own name.”', 'Cutlass: “So… chaos?”', 'Ruby: “Elegant chaos.”'],
          choices: [
            { label: 'Hand Cutlass the to-do list', score: 1, reply: ['Cutlass: “Every item on this ruins the ball. I love it.”'] },
            { label: 'Put Jade in charge of the punch bowl', score: 1, reply: ['Jade: “What goes in the punch?”', 'Ruby: “Nothing you’re thinking of.”'] },
            { label: 'Ask Hazel to keep watch for a gold tooth', score: 1, reply: ['Hazel: “I’ll look at everybody’s teeth! Very politely.”'] },
          ] },
      ],
      ends: [[0, 'The music starts. Work through the to-do list, and don’t let Ruby catch you.']],
      play: { href: '../pirate-ball/index.html', label: 'Play Ballroom chaos' },
      back: 'In the chaos of the ball, Hazel spotted a gold tooth glinting by the door. Goldtooth slipped away, muttering about “the compass.”' },

    { id: 'island', level: 0, kind: 'crew', from: 'bones', title: 'The Island', requires: ['crispin'], bg: 'island', cast: ['ruby', 'cutlass'],
      hook: 'Captain Ruby, Captain Cutlass: there’s something on that island you really need to look at. Just the two of you. Nothing suspicious.',
      accept: 'Row ashore',
      beats: [
        { text: 'Ruby and Cutlass row ashore and inspect the island alone. Palm trees, white sand, and nothing at all to look at.',
          lines: ['Cutlass: “What exactly were we meant to see?”', 'Ruby: “…Cutlass. Look at the ship.”', 'The ship is sailing off. On the sand sits a little pile of their belongings and a note: “Two weeks. Quality time. Love, the crews.”'],
          choices: [
            { label: 'Shout at the ship', score: 1, reply: ['Ruby: “I WILL MAKE YOU SWAB EVERY DECK IN THE OCEAN!”', 'Faintly, from the ship: “Love you, Captain!”'] },
            { label: 'Laugh it off', score: 2, reply: ['Cutlass: “Your crew planned this?”', 'Ruby: “Both our crews did. Traitors, every one.” She is smiling.'] },
            { label: 'Count what they left you', score: 1, reply: ['A blanket, a cooking pot, Ruby’s spyglass, and Cutlass’s spare boots. Just one boot.'] },
          ] },
        { game: 'island', how: 'Romantic games! First catch supper together: move Cutlass and his basket to catch fish and coconuts, and dodge the crabs. Then join up the stars under the night sky.' },
      ],
      ends: [[0, 'Two weeks later the ship comes back. The crews line the rail, grinning. Ruby has a great many chores to hand out.'],
             [6, 'Two weeks later the ship comes back. Ruby and Cutlass are sitting very close by the fire, and pretend they weren’t. Both crews cheer.']] },

    { id: 'cooking', level: 0, kind: 'crew', from: 'odessa', title: 'Odessa’s Cooking Show', goto: 'dining', bg: 'galley', cast: ['ruby', 'odessa', 'cutlass'],
      hook: 'Captain! I’m doing a cooking show in the dining salon, and I need a helper who can stir AND be charming.',
      gotoHint: 'Odessa is waiting in the dining salon, through the captain’s quarters.', accept: 'I’ll help',
      beats: [
        { place: { odessa: .62 }, approach: 'odessa', goal: 'Odessa is at the head of the table with an apron for you. Go and join her.',
          text: 'The whole crew squeezes into the dining salon. Odessa ties an apron on Ruby with a flourish.',
          lines: ['Odessa: “Welcome, hungry sailors, to Odessa’s Galley! Today’s dish is…”'],
          choices: [
            { label: 'Seven-spice fish stew', score: 2, reply: ['Odessa: “A classic! Smell that, everyone.”', 'Jade faints happily.'] },
            { label: 'Cutlass’s favourite: steak and bread', score: 2, reply: ['Cutlass, from the back row: “I didn’t say it was my favourite.”', 'He has a napkin tucked in already.'] },
            { label: 'Something with rum in it', score: 0, reply: ['Ruby: “There is no rum on this ship.”', 'Odessa: “Moving swiftly on!”'] },
          ] },
        { game: 'cooking', how: 'Lights, camera, stew! Tap the right ingredients as they fly past (or press Space when one is over the pot). Keep the rum, boots and socks out. When the stew boils over, stir it fast with ↓ or a tap on the pot.' },
      ],
      ends: [[0, 'The show was a mess, but every bowl came back empty.'], [5, 'A triumph! Odessa’s Galley is the talk of the ship, and Crispin asks, very quietly, for the recipe.']] },

    { id: 'charm', level: 0, kind: 'crew', from: 'jade', title: 'Charm a Lady', bg: 'deck', cast: ['jade', 'cutlass', 'scarlett'],
      hook: 'Cap’n, the boys have decided to woo your crew. We need… moral support. And maybe a bucket for when it goes wrong.',
      beats: [{ text: 'Cutlass’s boys line up on deck in their cleanest shirts. Ruby’s crew has a mop, a bucket, and very little patience.',
                lines: ['Jade: “Five rounds to win her heart. How hard can it be?”', 'Scarlett: “Very.”'] }],
      ends: [[0, 'Pick what to say, what to give her, and what to ask.']],
      play: { href: '../pirate-charm/index.html', label: 'Play Charm a lady' }, back: 'The boys are back from their wooing. Some of them are still damp.' },

    { id: 'insults', level: 0, kind: 'crew', from: 'monsoon', title: 'Insults', bg: 'deck', cast: ['monsoon', 'cutlass'],
      hook: 'Captain, one of Goldtooth’s old crew is on the dock calling us bilge rats. Swords are for show. Let’s duel him with words.',
      beats: [{ text: 'Goldtooth’s former crewmate struts up and down the dock. He used to sail with Cutlass, and he has a mouth on him.',
                lines: ['Monsoon: “The real weapon is a sharp tongue.”', 'Cutlass: “Then you’d better sharpen yours.”'] }],
      ends: [[0, 'Win with the perfect comeback and send your rival over the side.']],
      play: { href: '../pirate-duel/index.html', label: 'Play Insult duel' }, back: 'Goldtooth’s old crewmate is still dripping wet on the dock, and he’s finally stopped talking.' },

    { id: 'pranks', level: 0, kind: 'crew', from: 'absalom', title: 'Prank Wars', bg: 'deck', cast: ['absalom', 'cutlass'],
      hook: 'Captain Ruby. Captain Cutlass has no sense of humour. I have five pranks. Are you in?',
      beats: [{ text: 'Cutlass is patrolling his own deck, suspicious of everyone.',
                lines: ['Absalom: “Five pranks, no getting caught, and then we sit back and enjoy the show.”', 'Ruby: “I didn’t hear any of this.”'] }],
      ends: [[0, 'Sneak to each prank spot while Cutlass isn’t looking.']],
      play: { href: '../pirate-pranks/index.html', label: 'Play Pirate pranks' }, back: 'Cutlass is checking every barrel twice now. Absalom looks very pleased with himself.' },

    { id: 'wagon', level: 0, kind: 'plot', title: 'The Wet Dog Chase', bg: 'town', cast: ['ruby', 'cutlass', 'absalom', 'arabella', 'hazel', 'monsoon', 'jade', 'bones'],
      hook: 'Goldtooth’s men have been spotted running through the harbour town with a crate. Then hooves clatter on the dock…',
      accept: 'See who it is',
      beats: [
        { text: 'Absalom comes up to the crew driving a horse-drawn wagon. There is a very wet dog in it.',
          lines: ['Absalom: “Found it! Wagon, horse, and a dog. The dog came free.”', 'Cutlass: “Why is it wet?”', 'Absalom: “He was in the harbour. Now he’s in the wagon.”', 'Ruby: “Everyone in! Goldtooth’s men are getting away!”'],
          choices: [
            { label: 'Ruby takes the reins', score: 1, reply: ['Ruby: “Hold on.” Arabella, Hazel, Monsoon, Jade and Bones pile into the back with the dog.'] },
            { label: 'Cutlass takes the reins', score: 1, reply: ['Cutlass: “I’ve never driven a wagon.”', 'Ruby: “Now’s your chance.” The others pile in the back.'] },
            { label: 'Let Absalom keep driving', score: 2, reply: ['Absalom: “Hold on to your hats!”', 'Arabella, Hazel, Monsoon, Jade and Bones barely make it into the back.'] },
          ] },
        { game: 'wagon', how: 'Chase them through the market! Change lanes with ↑ and ↓ to dodge fruit stalls, laundry, barrels and chickens. Every crash slows you down. Grab free oranges.', mustWin: true },
        { text: 'Cornered at the edge of town, Goldtooth’s men drop the crate and run. It isn’t the compass inside. It’s an invitation.',
          lines: ['Bones (reading): “Clement Goldtooth requests the honour of Captain Ruby’s hand in marriage.”', 'Ruby: “He WHAT?”', 'Cutlass: “Over my dead body.”', 'Bones: “Does this mean there’s cake?”'] },
      ],
      ends: [[0, 'The dog is very proud of himself. Goldtooth is planning a wedding, and Ruby did not say yes.'], [5, 'What a chase! The dog is now an honorary crewmate. Goldtooth is planning a wedding, and Ruby did not say yes.']] },

    { id: 'dance', level: 0, kind: 'crew', from: 'scarlett', title: 'Dance Competition', bg: 'deck', cast: ['scarlett', 'cutlass', 'bones'],
      hook: 'Captain! Cutlass’s boys say they can out-dance us. Us! Shall we show them how it’s done?',
      beats: [{ text: 'One deck, one fiddle, and absolutely no dignity.', lines: ['Scarlett: “Ruby’s crew against Cutlass’s boys. Winner doesn’t swab the deck for a week.”', 'Bones: “I’ve been practising!”'] }],
      ends: [[0, 'Hit the moves to out-dance the other crew.']],
      play: { href: '../pirate-dance/index.html', label: 'Play Dancing wars' }, back: 'The fiddle has finally stopped. Somebody’s boot is stuck in the rigging.' },

    { id: 'wedding', level: 0, kind: 'plot', final: true, item: 0, title: 'Wreck a Wedding', bg: 'chapel',
      cast: ['ruby', 'clement', 'cutlass', 'bones', 'hazel', 'odessa', 'crispin', 'tempest'],
      hook: 'Ruby wakes up in a lace gown on Goldtooth’s ship. Goldtooth has kidnapped her for the wedding!',
      accept: 'Wreck it',
      beats: [
        { place: { clement: .86 }, text: 'Barrels for pews. A cake taller than Hazel. Goldtooth in a powdered wig, the Sun Compass glinting around his neck. The crew hides in the rigging with baskets of tomatoes and fish. If the rescue isn’t funny enough, they will throw them.',
          lines: ['Goldtooth: “Dearly beloved, we are gathered here because I said so.”', 'Bones (in a fake beard, whispering): “Psst, Cutlass. The gags. Set them up while he isn’t looking.”'] },
        { game: 'wedding', how: 'Sneak Cutlass around the chapel and set up four gags. Hold Space (or hold a tap) at each one. Goldtooth keeps turning around: when you see “!”, stop moving. The crew’s patience runs down, so be quick and be funny.', mustWin: true },
        { text: 'The gags go off one after another: the wet dog charges down the aisle, the cake is a fish, the carpet is soap, and the bell goes CLANG like a frying pan. Cutlass swings in on a rope… straight into the fish-cake. The crew howls with laughter.' },
        { text: 'Goldtooth lunges for Ruby, the Sun Compass swinging from his neck.',
          choices: [
            { label: 'Trip him with the bouquet and snatch the compass', score: 2, reply: ['Goldtooth faceplants into the fish-cake. The compass is in Ruby’s hand.'] },
            { label: 'Tempest pulls the wedding carpet', score: 2, reply: ['Goldtooth slides all the way down the aisle and off the side of the ship. SPLASH.', 'The compass flies up into the air, and Ruby catches it.'] },
            { label: 'Ask him nicely for the compass', score: 0, reply: ['Goldtooth: “No.” The crew throws a tomato at Ruby. Fair.'] },
          ] },
      ],
      failText: 'Not funny enough! Tomatoes and fish rain down from the rigging, and Goldtooth calls for the vows to start over.',
      ends: [[0, 'The wedding is wrecked beyond repair. Ruby holds up the Sun Compass, and both crews cheer from the rigging, throwing tomatoes at Goldtooth instead.']] },

    // ================= LEVEL 1 · EVANGELINE =================
    { id: 'mystery', level: 1, kind: 'plot', title: 'Crispinlock Holmes', goto: 'study', bg: 'study', pass: 3, cast: ['crispin', 'monsoon', 'jade', 'ruby'],
      hook: 'Ruby’s chart, the only one showing where the second treasure lies, has vanished from the study. Crispin has put on a deerstalker hat.',
      gotoHint: 'Meet Crispin in the captain’s study, past the dining salon.', accept: 'Investigate',
      beats: [
        { place: { crispin: .55, monsoon: .7, jade: .84 }, approach: 'crispin', goal: 'Crispin is pacing by the desk in a deerstalker hat. Go and hear what he’s found.',
          text: 'Crispin paces the study with a magnifying glass.',
          lines: ['Crispin: “Crispinlock Holmes, at your service. Monsoon, you are my Dr. Watson.”', 'Jade: “And me!”', 'Crispin: “There was meant to be ONE assistant.”', 'Jade: “I insisted!”', 'Monsoon: “He did insist.”'],
          },
        { game: 'mystery', how: 'Search the study with Crispin’s magnifying glass. Anything worth finding will glint when the glass is close. Inspect it with Space or a tap.' },
        { text: 'Crispin gathers every clue: the latch was opened from inside, the desk smells of rosewater, and small, wet, bare footprints lead to the rail.',
          lines: ['Crispin: “Our suspects, gentlemen.”', 'Monsoon: “Hazel was drawing in here this morning. She has ink on her fingers.”', 'Jade: “Bones was swabbing the deck. His boots are covered in sand.”', 'Monsoon: “And there’s Coral, the new deckhand who joined at the last port. She swims every morning, and she wears perfume.”', 'Jade: “Cutlass was in here too! He’s always in here. Staring at Ruby’s handwriting.”', 'Ruby: “…He what?”'],
          choices: [
            { label: 'Ask about the footprints again', score: 0, reply: ['Crispin: “Small. Bare. Wet. The thief took off her shoes and went over the rail.”'] },
            { label: 'Ask who wears rosewater', score: 0, reply: ['Jade: “Not Bones. Bones smells like Bones.”'] },
            { label: 'Ask Jade to stop sniffing things', score: 0, reply: ['Jade: “I can’t. I’m a detective now.”'] },
          ] },
        { text: 'Crispinlock Holmes turns to Ruby. “Captain, you may name the culprit.”',
          choices: [
            { label: 'Hazel, with her inky fingers', score: 0, reply: ['Hazel: “I was drawing the dog!” She holds up a lovely drawing of the dog.'] },
            { label: 'Bones, with his sandy boots', score: 0, reply: ['Bones: “I wear my boots to bed. They’re always sandy.”', 'Crispin: “…Disgusting. And not the thief.”'] },
            { label: 'Coral, the new deckhand', score: 3, reply: ['Coral smells of roses and has wet hair. She sighs.', 'Coral: “Fine. I sail for Captain Evangeline. And your chart is already on her ship.”'] },
            { label: 'Cutlass, obviously', score: 0, reply: ['Cutlass: “I was only reading it!”', 'Crispin: “His boots are enormous. The footprints are small. Not him.”'] },
          ] },
      ],
      failText: 'Crispin shakes his head. “The evidence says otherwise.” Look at the clues again: rosewater, small bare wet footprints, a latch opened from inside.',
      ends: [[0, 'The mystery is solved! Coral sails for Evangeline, captain of the girl pirates, and Ruby’s chart is already on Evangeline’s ship. Crispin keeps the hat.']] },

    { id: 'disguise', level: 1, kind: 'crew', from: 'tempest', title: 'Dress Up as a Lady', bg: 'ballroom', room: 'gallery', cast: ['tempest', 'cutlass', 'jade', 'monsoon'],
      hook: 'Captain, I’ve got gowns, wigs and rouge, and five boys who need to pass as ladies. Tonight.',
      beats: [{ text: 'There’s a royal ball ashore, and the guests are whispering about pirates. Cutlass’s boys would be recognised anywhere. So tonight, they go as ladies. Ridiculous ladies.',
                lines: ['Tempest: “Hold still.”', 'Cutlass: “I refuse.”', 'Tempest: “Hold. Still.”'] }],
      ends: [[0, 'Eavesdrop on the guests, and when someone speaks to you, act like a lady, fast.']],
      play: { href: '../pirate-disguise/index.html', label: 'Play Ladies in disguise' }, back: 'The boys are back aboard, still wearing their wigs. Jade says his is “growing on him.”' },

    { id: 'sisters', level: 1, kind: 'heart', title: 'Cutlass’s Sisters', requires: ['mystery'], bg: 'deck', cast: ['cutlass', 'ruby', 'bones'],
      hook: 'A rowboat bumps against the hull. Two young women climb aboard, soaking wet and grinning. Cutlass has gone pale.',
      accept: 'Greet them',
      beats: [
        { text: 'Cutlass’s sisters wring the seawater out of their hair. Cutlass looks like he wants to dive overboard.',
          lines: ['Cutlass’s sisters: “Hello, little brother!”', 'Cutlass: “What are you doing here?”', 'Cutlass’s sisters: “We heard a lady captain rescued you. We HAD to meet her.”'],
          choices: [
            { label: 'Welcome them warmly', score: 2, reply: ['Ruby: “Any family of Cutlass is welcome on my ship.”', 'Cutlass’s sisters: “Ooh, she’s lovely. Cutlass, she’s lovely!”'] },
            { label: 'Ask for embarrassing stories', score: 2, reply: ['Cutlass’s sisters: “He cried when a seagull stole his biscuit. He was nineteen.”', 'Cutlass: “It was a VERY big seagull.”'] },
            { label: 'Ask why they’re soaking wet', score: 2, reply: ['They glance at each other and smile.', 'Cutlass’s sisters: “We swam the last mile. We’re… good swimmers.”'] },
          ] },
        { text: 'Bones watches the sisters sit on the rail with their feet in the sea. Their feet are shimmering.',
          lines: ['Bones: “Captain… are their feet turning into tails?”', 'Cutlass: “Don’t. Make it. A thing.”', 'Cutlass’s sisters: “We can turn into mermaids. It runs in the family. Well, in half the family.”'] },
      ],
      ends: [[0, 'Cutlass’s sisters join the ship. Cutlass is mortified. Everyone else is delighted.']] },

    { id: 'havoc', level: 1, kind: 'plot', title: 'Charm an Enemy, Cause Havoc', requires: ['mystery'], bg: 'rival', cast: ['ruby', 'jade', 'absalom', 'stormcaller'],
      hook: 'Evangeline’s ship is anchored in the next cove, Ruby’s stolen chart aboard. Her girls are having a party on deck.',
      accept: 'Sneak aboard',
      beats: [
        { text: 'Part one: charm. A few of the boys row over with flowers and their best manners. Evangeline’s girl pirates look them up and down.',
          lines: ['A girl pirate: “And who invited you?”', 'Jade: “We’re your new admirers!”'] },
        { game: 'charm', how: 'Keep all five of Evangeline’s girls charmed. Each one has a heart meter that keeps falling: tap her (or press her number) to pay her a compliment. If a meter runs out she gets suspicious, and four suspicious girls ends the party.', mustWin: true },
        { text: 'Part two: cause a disaster. While the party roars on deck, Ruby slips below decks. The powder room is at the far end, and the girls on watch carry lanterns.' },
        { game: 'sneak', how: 'Sneak Ruby to the powder room. Walk with ← →, and hold ↓ behind a barrel to hide when a lantern swings your way. At the powder room, press Space to light the fireworks.' },
        { text: 'In the chaos, Ruby bursts into Evangeline’s cabin and grabs the chart. Then a voice behind her, cold as the deep sea…',
          lines: ['Evangeline: “Leaving so soon, Captain Ruby?”'] },
      ],
      ends: [[0, 'Ruby escapes with the chart, but Evangeline saw her face. She will come for them.'], [5, 'Utter havoc! Ruby escapes with the chart while Evangeline’s ship burns pink and green. But Evangeline saw her face. She will come for them.']] },

    { id: 'plays', level: 1, kind: 'crew', from: 'marietta', title: 'Crew Plays', bg: 'deck', cast: ['marietta', 'scarlett', 'arabella', 'jade', 'bones', 'monsoon'],
      hook: 'Captain, we’re putting on a play for you and Captain Cutlass tonight! It’s a romance. It will go perfectly.',
      accept: 'Take a seat',
      beats: [
        { text: 'Ruby and Cutlass sit on two barrels in the front row. Marietta announces “The Princess and the Sea Captain.” It is very obviously about them.',
          lines: ['Cutlass: “Is that meant to be me?”', 'Ruby: “It has your eyebrows.”'],
          choices: [
            { label: 'Cheer for the leading lady', score: 1, reply: ['Arabella takes a bow. Jade, offstage: “What about the leading man?!”'] },
            { label: 'Cheer for the leading man', score: 1, reply: ['Bones takes a deep, dramatic bow and knocks over the painted sea.'] },
            { label: 'Ask what happens next', score: 1, reply: ['Marietta: “No spoilers!” She is clearly making it up as she goes.'] },
          ] },
        { game: 'plays', how: 'The play starts, and everything goes wrong. When a mishap pops up over an actor, tap them (or press their number) to save the scene before the timer runs out. It will still be a disaster. That’s the fun.' },
        { text: 'Everything is falling apart. Marietta looks at Ruby, pleading.',
          choices: [
            { label: 'Tell everyone to make up the ending', score: 1, reply: ['The ending involves a sea serpent, a wedding, and Monsoon in a crown. Nobody knows why.'] },
            { label: 'Ruby and Cutlass take the stage', score: 2, reply: ['Ruby and Cutlass play the final scene themselves. The crew goes very, very quiet.', 'Cutlass forgets it’s a play.'] },
            { label: 'Clap loudly to end it', score: 1, reply: ['The girls take their bow and leave in a huff. The boys bow four more times.'] },
          ] },
      ],
      ends: [[0, 'The play was a disaster from start to finish. It was the best night the ship has ever had.'], [4, 'The play was a disaster, right until the two captains finished it themselves. Marietta is already writing a sequel.']] },

    { id: 'shanty', level: 1, kind: 'crew', from: 'stormcaller', title: 'Sea Shanties', bg: 'deck', cast: ['stormcaller', 'cutlass', 'ruby'],
      hook: 'Captain, Evangeline’s girls are singing a shanty about us across the water. It is not flattering. Shall we sing back?',
      beats: [{ text: 'Across the cove, Evangeline’s crew is roasting Ruby’s ship in song.', lines: ['Stormcaller: “Two crews, one shanty, zero mercy.”', 'Cutlass: “I’ll take the low notes.”'] }],
      ends: [[0, 'Hit the notes to roast the other captain in song.']],
      play: { href: '../pirate-shanty/index.html', label: 'Play Sea shanties' }, back: 'The singing has stopped. Somebody across the cove is definitely sulking.' },

    { id: 'plank', level: 1, kind: 'plot', title: 'Walk the Plank', bg: 'rival', cast: ['cutlass', 'ruby'],
      hook: 'A shadow falls across the deck. Evangeline’s ship has come alongside, and her girl pirates are swinging aboard!',
      accept: 'Draw swords',
      beats: [
        { text: 'There are too many of them. Evangeline’s crew drags Cutlass onto a plank over the shark-filled sea.',
          lines: ['Evangeline: “Give me the chart, or your captain walks.”', 'Ruby: “He isn’t my captain.”', 'Cutlass: “Ruby!”', 'Ruby: “…He’s my Cutlass. And he isn’t walking anywhere.”'],
        },
        { game: 'plank', how: 'Keep Cutlass balanced on the wobbling plank with ← →. When a girl pirate shouts “!”, parry with Space just before her sword lands. Parry six attacks, then Evangeline herself. Four hits and he’s in the sea.', mustWin: true },
      ],
      failText: 'SPLASH! Cutlass goes into the sea. The crew fishes him out and Evangeline laughs from her ship. Try his stunts, tricks and swordfighting again.',
      ends: [[0, 'Evangeline retreats, furious. As her ship sails off, her crew throws a heavy chest overboard. Through the spyglass, Ruby sees the Siren’s Pearl inside, sinking to the bottom of the sea.']] },

    { id: 'mermaid', level: 1, kind: 'plot', final: true, item: 1, title: 'Mermaid Dive', bg: 'sea', cast: ['ruby', 'cutlass', 'jade', 'monsoon', 'bones'],
      hook: 'The Siren’s Pearl is at the bottom of the sea. Cutlass’s sisters have an idea. Cutlass hates it already.',
      accept: 'Hear the idea',
      beats: [
        { text: 'Cutlass’s sisters can turn into mermaids. So they decide: why not turn some of Cutlass’s crew into mermen too?',
          lines: ['Cutlass’s sisters: “Just a sprinkle of sea salt and a little song!”', 'Jade: “My legs! Where are my legs?!”', 'Monsoon: “I have a TAIL. It’s BLUE.”', 'Bones: “I love it. I’m never going back.”'],
          choices: [
            { label: 'Calm everyone down', score: 2, reply: ['Ruby: “It’s temporary. …It is temporary?”', 'Cutlass’s sisters: “Mostly!”'] },
            { label: 'Ask for a tail too', score: 2, reply: ['Ruby gets a ruby-red tail. Cutlass stares. Cutlass gets a tail too, and nearly drowns from staring.'] },
            { label: 'Throw Cutlass in first', score: 1, reply: ['Cutlass: “Ruby, NO—” SPLASH. He comes up with a tail and a very betrayed look.'] },
          ] },
        { game: 'mermaid', how: 'Swim Ruby and the new mermen through the deep. Follow three shells to the wreck. Grab bubbles to refill your air and keep away from the jellyfish. A grumpy octopus guards the chest: tickle it with Space until it lets go.', mustWin: true },
      ],
      ends: [[0, 'The chest creaks open. Inside, glowing like moonlight, is the Siren’s Pearl. Everyone swims back up, and the tails take a whole day to wear off. Bones is heartbroken when his does.']] },

    // ================= LEVEL 2 · THE PIRATE KING =================
    { id: 'oro', level: 2, kind: 'heart', title: 'Oro', unlock: 'oro', bg: 'deck', cast: ['ruby', 'oro', 'cutlass'],
      hook: 'A small fishing boat flags you down. Standing in it, arms crossed, is Ruby’s little brother, Oro.',
      accept: 'Bring him aboard',
      beats: [
        { text: 'Oro climbs up the rope ladder and looks the ship over like he owns it.',
          lines: ['Oro: “Took you long enough, big sister.”', 'Ruby: “Oro! What are you doing out here?”', 'Oro: “I heard you’re hunting the third treasure. I know who has it. The Pirate King.”', 'Cutlass: “The Pirate King? Nobody who sails against him comes home.”', 'Oro: “Then you need me.”'],
          choices: [
            { label: 'Hug him', score: 2, reply: ['Oro: “Ugh. Fine. One hug.” It is a very long hug.'] },
            { label: 'Ask how he knows about the Pirate King', score: 2, reply: ['Oro: “I’ve been sailing the eastern seas. His fleet is huge, and half the sailors on it aren’t there by choice.”'] },
            { label: 'Introduce him to Cutlass', score: 2, reply: ['Oro looks Cutlass up and down.', 'Oro: “So you’re the one.”', 'Cutlass: “The one what?”', 'Oro just smirks.'] },
          ] },
      ],
      ends: [[0, 'Oro joins the crew. He knows the eastern seas, and he knows the way to an old master in the jungle who knows the Pirate King’s secrets.']] },

    { id: 'rafting', level: 2, kind: 'plot', title: 'River Rafting in the Jungle', bg: 'river', cast: ['ruby', 'cutlass'],
      hook: 'The old master lives upriver, deep in the jungle. The only way there is by raft, and Oro says the river is “a bit lively.”',
      accept: 'Push off',
      beats: [
        { text: 'Ruby and Cutlass set off on a little bamboo raft. The jungle closes in, loud with birds. The river starts to speed up.',
          choices: [
            { label: 'Ruby steers, Cutlass paddles', score: 2, reply: ['Cutlass: “Why do I always paddle?”', 'Ruby: “Because you’re good at it.” He paddles harder.'] },
            { label: 'Both paddle', score: 1, reply: ['They paddle in opposite directions and spin in a slow circle.'] },
            { label: 'Cutlass steers', score: 0, reply: ['They hit a rock straight away. Cutlass: “That rock moved!”'] },
          ] },
        { game: 'rafting', how: 'Steer the raft down the river with ← →. Dodge rocks, logs, crocodiles and whirlpools. Three hits and you wash up downstream. At the waterfall, grab the swinging vine at just the right moment.', mustWin: true },
      ],
      failText: 'The river wins this time. Ruby and Cutlass wash up downstream, soggy and arguing. Try the river again.',
      ends: [[0, 'Soaked to the bone, they climb the last hill to a little stone house in the mist. An old man sits outside with a board game laid out, as if he’s been waiting for them.']] },

    { id: 'boardgame', level: 2, kind: 'plot', title: 'The Old Master’s Game', bg: 'temple', cast: ['ruby', 'cutlass'],
      hook: 'The wise old master will share the Pirate King’s secrets, but only with someone who will play him at Go, the old stone game of black and white.',
      accept: 'Sit down to play',
      beats: [
        { text: 'The old master sets out a wooden board and two bowls of stones, one black and one white.',
          lines: ['The old master: “One of you will play. The game will tell me who you are.”'],
          choices: [
            { label: 'Ruby plays', score: 1, reply: ['Ruby kneels at the board and bows. The old master smiles.'] },
            { label: 'Cutlass plays', score: 1, reply: ['Cutlass sits down cross-legged and cracks his knuckles. The old master raises an eyebrow.'] },
          ] },
        { game: 'boardgame', how: 'A small game of Go on a 7×7 board. Take turns placing stones on the points where the lines cross. A stone or a group is captured when the other player surrounds it on every side. The first player to capture a stone wins. You play black and go first.' },
        { text: 'The end of the game. The board is nearly full. The old master sets down his last stone and looks up.',
          lines: ['The old master: “You play with a good heart. So I will tell you.”', 'The old master: “The Pirate King keeps the Dragon Seal on his flagship. His crews obey him only because he holds their freedom in chains. Free them, and he stands alone.”', 'The old master: “He will not expect you to fight with swords. Fight with whatever is at hand.”'] },
      ],
      ends: [[0, 'The old master bows. Ruby and Cutlass bow back. Now they know the Pirate King’s secret: free those in servitude, and he stands alone.']] },

    { id: 'mopwar', level: 2, kind: 'plot', final: true, item: 2, title: 'The Mop War', bg: 'eastern', cast: ['ruby', 'cutlass', 'oro', 'crispin', 'scarlett', 'tempest', 'jade', 'monsoon', 'bones'],
      hook: 'The Pirate King’s fleet blocks the horizon. His flagship flies a dragon banner. The crews have barrels, rigging, and mops!',
      accept: 'Battle stations!',
      beats: [
        { text: 'The Pirate King’s fleet surrounds them. There are far too many swords. But the crews have barrels, rigging, mops… and a plan.',
          lines: ['Ruby: “Remember what the old master said. Free those in servitude, and he stands alone.”', 'Cutlass: “And if that doesn’t work?”', 'Scarlett: “Then we mop them.”'],
          choices: [
            { label: 'Roll the barrels down the gangplank', score: 2, reply: ['Twenty barrels thunder onto the enemy deck like bowling balls. Strike!'] },
            { label: 'Soap the whole deck', score: 2, reply: ['The Pirate King’s crews slide around like penguins on ice.'] },
            { label: 'Charge in with swords drawn', score: 0, reply: ['The Pirate King: “Swords? I have a thousand swords.” They have to fall back.'] },
          ] },
        { game: 'mopwar', how: 'Fight with whatever is at hand! Move with ← →, swing your mop with Space, press ↑ by a barrel stack to roll one, and hold ↓ beside the chained sailors to free them. Freed sailors fight with you. Free all three and mop the crews, and the Pirate King comes for you himself.', mustWin: true },
      ],
      failText: 'The Pirate King’s fleet pushes them back! Regroup and remember what the old master said: fight with whatever is at hand, and free those in servitude.',
      ends: [[0, 'The Pirate King surrenders the Dragon Seal. The sailors he kept in chains are free, and some of them ask to join Ruby’s crew. The Mop War will be sung about for a hundred years.']] },

    // ================= AFTER ALL THREE TREASURES =================
    { id: 'finale', level: 3, kind: 'plot', title: 'Three Treasures', bg: 'night', cast: ['ruby', 'cutlass'],
      hook: 'The Sun Compass, the Siren’s Pearl and the Dragon Seal sit together on the captain’s desk. The compass needle has started to spin.',
      accept: 'Look closer',
      beats: [
        { text: 'Late at night, the two captains sit with all three treasures on the desk between them. The compass points at Ruby. Then at Cutlass. Then it stops, pointing at the space between them.',
          lines: ['Cutlass: “It points to what the holder has lost.”', 'Ruby: “Then why is it pointing at us?”', 'Cutlass: “…Maybe it isn’t. Maybe it’s pointing at what we found.”'] },
      ],
      ends: [[0, 'The three treasures are found, and the two captains sail on together. (More to come…)']] },
  ],
};
