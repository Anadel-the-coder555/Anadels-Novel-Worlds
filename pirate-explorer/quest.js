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
        { text: 'The thumping is loudest at the end of the hall. Absalom is leaning against a cabin door, whistling far too innocently.',
          lines: ['Absalom: “Nothing in there, Captain. Just barrels. Very lively barrels.”', 'Ruby: “Barrels don’t hum sea shanties off-key, Absalom.”'],
          choices: [
            { label: 'Order him aside', score: 2, reply: ['Ruby: “Step aside. Now.”', 'Absalom: “Aye aye, Captain…”'] },
            { label: 'Ask Cutlass to handle his boy', score: 2, reply: ['Cutlass: “Absalom. Door. Open it.”', 'Absalom: “You never let me keep anything.”'] },
            { label: 'Bribe him with Odessa’s pie', score: 1, reply: ['Absalom: “…Is it the cherry one?”', 'He steps aside, already drooling.'] },
          ] },
        { text: 'Inside the bedchamber, a young man in a velvet coat is tied to a chair, gagged with sailcloth. His boots are polished. His glare could sink a ship.',
          cast: ['ruby', 'cutlass', 'absalom', 'crispin'],
          lines: ['Crispin: “Mmmph! MMPH!”', 'Absalom: “He was standing on the dock looking so lonely, Cap’n. I thought he’d make a fine shipmate!”'],
          choices: [
            { label: 'Untie him gently', score: 2, reply: ['Ruby loosens the ropes, one knot at a time.', 'Crispin: “…Thank you. I suppose.”'] },
            { label: 'Take the gag off first', score: 1, reply: ['Crispin: “Outrageous! Barbaric! I am LORD Crispin and I will see you all hanged!”', 'Ruby: “Perhaps the gag could go back on.”'] },
            { label: 'Let Cutlass cut him loose', score: 1, reply: ['Cutlass slices the ropes with one flourish. Also one of Crispin’s coat buttons.', 'Crispin: “That was SILK.”'] },
          ] },
        { text: 'Crispin rubs his wrists and looks around the cabin as if it were a pigsty.', cast: ['ruby', 'cutlass', 'crispin'],
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
        { text: 'Romantic game one: build a shelter before dark.',
          choices: [
            { label: 'Ruby designs it, Cutlass does the lifting', score: 2, reply: ['It is the sturdiest shelter on any island anywhere.', 'Cutlass: “We make a good team.”', 'Ruby: “Don’t let it go to your head.”'] },
            { label: 'Race to build two shelters', score: 1, reply: ['Cutlass’s shelter collapses. He moves into Ruby’s.'] },
            { label: 'Cutlass insists he knows best', score: 0, reply: ['It falls on him. Twice.'] },
          ] },
        { text: 'Romantic game two: catch supper.',
          choices: [
            { label: 'A spear-fishing contest', score: 2, reply: ['Ruby catches three fish. Cutlass catches one, and a boot. Not his boot.'] },
            { label: 'Coconut bowling for dessert', score: 1, reply: ['They knock down eleven coconuts and argue about the score until sunset.'] },
            { label: 'Cutlass wrestles a crab to impress her', score: 1, reply: ['The crab wins.', 'Ruby: “My hero.”'] },
          ] },
        { text: 'Romantic game three: under the stars.',
          lines: ['Cutlass: “You know every star by name, don’t you?”', 'Ruby: “My father taught me. That one leads home.”'],
          choices: [
            { label: 'Teach him the stars', score: 2, reply: ['Ruby guides his hand across the sky, star by star. He isn’t really looking at the stars.'] },
            { label: 'Ask about his old ship', score: 2, reply: ['Cutlass: “I’d lost everything when you found us.”', 'Cutlass: “…Maybe not everything.”'] },
            { label: 'Fall asleep on his shoulder', score: 2, reply: ['Cutlass doesn’t move a muscle all night, in case he wakes her.'] },
          ] },
      ],
      ends: [[0, 'Two weeks later the ship comes back. The crews line the rail, grinning. Ruby has a great many chores to hand out.'],
             [6, 'Two weeks later the ship comes back. Ruby and Cutlass are sitting very close by the fire, and pretend they weren’t. Both crews cheer.']] },

    { id: 'cooking', level: 0, kind: 'crew', from: 'odessa', title: 'Odessa’s Cooking Show', goto: 'dining', bg: 'dining', cast: ['ruby', 'odessa', 'cutlass'],
      hook: 'Captain! I’m doing a cooking show in the dining salon, and I need a helper who can stir AND be charming.',
      gotoHint: 'Odessa is waiting in the dining salon, through the captain’s quarters.', accept: 'I’ll help',
      beats: [
        { text: 'The whole crew squeezes into the dining salon. Odessa ties an apron on Ruby with a flourish.',
          lines: ['Odessa: “Welcome, hungry sailors, to Odessa’s Galley! Today’s dish is…”'],
          choices: [
            { label: 'Seven-spice fish stew', score: 2, reply: ['Odessa: “A classic! Smell that, everyone.”', 'Jade faints happily.'] },
            { label: 'Cutlass’s favourite: steak and bread', score: 2, reply: ['Cutlass, from the back row: “I didn’t say it was my favourite.”', 'He has a napkin tucked in already.'] },
            { label: 'Something with rum in it', score: 0, reply: ['Ruby: “There is no rum on this ship.”', 'Odessa: “Moving swiftly on!”'] },
          ] },
        { text: 'The pot is bubbling. The audience is getting restless. Time to entertain!',
          choices: [
            { label: 'Juggle the onions', score: 2, reply: ['Three onions, four onions, five… one lands in Monsoon’s hat. He keeps it there.'] },
            { label: 'Tell a terrible fish joke', score: 1, reply: ['Ruby: “Why don’t fish play cards? They’re afraid of the net.”', 'Silence. Then Bones laughs so hard he falls off his stool.'] },
            { label: 'Invite Cutlass up to taste', score: 2, reply: ['Cutlass tastes it. Cutlass goes quiet. Cutlass asks for a bigger spoon.'] },
          ] },
        { text: 'Disaster! The stew is boiling over.',
          choices: [
            { label: 'Pull it off the heat', score: 2, reply: ['Saved, with a sizzle. The crowd applauds.'] },
            { label: 'Blame it on Cutlass', score: 1, reply: ['Cutlass: “I was sitting down!”', 'The crew boos him anyway.'] },
            { label: 'Call it “volcano stew” on purpose', score: 2, reply: ['Odessa: “Yes! The famous volcano stew!” Everyone wants seconds.'] },
          ] },
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
        { text: 'The wagon careens through the market. A fruit stall is dead ahead!',
          choices: [
            { label: 'Swerve through the laundry lines', score: 2, reply: ['Hazel: “I’ve got somebody’s bloomers on my head!”'] },
            { label: 'Straight through the fruit stall', score: 1, reply: ['Bones: “Free oranges!”', 'Ruby throws a coin back to the stall owner.'] },
            { label: 'Let the dog bark them clear', score: 2, reply: ['The dog barks, then shakes himself dry all over Monsoon.', 'Monsoon: “Why. Why me.”'] },
          ] },
        { text: 'Goldtooth’s men cut down an alley with their crate on a handcart.',
          choices: [
            { label: 'Jade leaps onto their cart', score: 2, reply: ['Jade: “I got it! I— the cart is rolling downhill. Is it supposed to be rolling downhill?”'] },
            { label: 'Arabella lassoes their wheel', score: 2, reply: ['One throw. The wheel locks, and the handcart flips over.', 'Arabella: “You’re welcome.”'] },
            { label: 'Monsoon throws the wet dog', score: 0, reply: ['The dog does not want to be thrown. The dog wins.'] },
          ] },
        { text: 'Cornered at the edge of town, Goldtooth’s men drop the crate and run. It isn’t the compass inside. It’s an invitation.',
          lines: ['Bones (reading): “Clement Goldtooth requests the honour of Captain Ruby’s hand in marriage.”', 'Ruby: “He WHAT?”', 'Cutlass: “Over my dead body.”', 'Bones: “Does this mean there’s cake?”'] },
      ],
      ends: [[0, 'The dog is very proud of himself. Goldtooth is planning a wedding, and Ruby did not say yes.'], [5, 'What a chase! The dog is now an honorary crewmate. Goldtooth is planning a wedding, and Ruby did not say yes.']] },

    { id: 'dance', level: 0, kind: 'crew', from: 'scarlett', title: 'Dance Competition', bg: 'deck', cast: ['scarlett', 'cutlass', 'bones'],
      hook: 'Captain! Cutlass’s boys say they can out-dance us. Us! Shall we show them how it’s done?',
      beats: [{ text: 'One deck, one fiddle, and absolutely no dignity.', lines: ['Scarlett: “Ruby’s crew against Cutlass’s boys. Winner doesn’t swab the deck for a week.”', 'Bones: “I’ve been practising!”'] }],
      ends: [[0, 'Hit the moves to out-dance the other crew.']],
      play: { href: '../pirate-dance/index.html', label: 'Play Dancing wars' }, back: 'The fiddle has finally stopped. Somebody’s boot is stuck in the rigging.' },

    { id: 'wedding', level: 0, kind: 'plot', final: true, item: 0, title: 'Wreck a Wedding', bg: 'chapel', pass: 6,
      cast: ['ruby', 'clement', 'cutlass', 'bones', 'hazel', 'odessa', 'crispin', 'tempest'],
      hook: 'Ruby wakes up in a lace gown on Goldtooth’s ship. Goldtooth has kidnapped her for the wedding!',
      accept: 'Wreck it',
      beats: [
        { text: 'Barrels for pews. A cake taller than Hazel. Goldtooth in a powdered wig, the Sun Compass glinting around his neck. The crew hides in the rigging with baskets of tomatoes and fish. If the rescue isn’t funny enough, they will throw them.',
          lines: ['Goldtooth: “Dearly beloved, we are gathered here because I said so.”'],
          choices: [
            { label: 'Hazel lets the wet dog loose down the aisle', score: 2, reply: ['The dog sprints down the aisle, shakes himself all over Goldtooth, and eats the bouquet.', 'The crew giggles in the rigging.'] },
            { label: 'Cutlass makes a stirring speech', score: 0, reply: ['Cutlass: “Unhand her, villain! For honour! For—”', 'SPLAT. A tomato. “BORING!” yells someone in the rigging.'] },
            { label: 'Odessa swaps the cake for a giant fish', score: 2, reply: ['Goldtooth cuts the cake. The cake looks back at him.'] },
          ] },
        { text: 'The priest (Bones, in a fake beard) asks if anyone objects.',
          choices: [
            { label: 'Every crewmate objects at once, in harmony', score: 2, reply: ['“WE OBJEEEECT!” in four-part harmony. Goldtooth’s wig flies off.'] },
            { label: 'Cutlass objects politely', score: 0, reply: ['Cutlass: “I respectfully object.”', 'A mackerel hits him in the ear. “Be FUNNY, Cap’n!”'] },
            { label: 'Crispin objects to the fashion', score: 2, reply: ['Crispin: “That wig is a crime against the crown, and I should know.”'] },
          ] },
        { text: 'Here come Cutlass’s heroics. He grabs a rope to swing in and save Ruby.',
          choices: [
            { label: 'He swings in… straight into the cake', score: 2, reply: ['Cutlass emerges from the fish-cake with a fin on his head. The crew howls.'] },
            { label: 'He swings in and lands perfectly', score: 0, reply: ['It’s flawless. Too flawless. The crew boos, and a bucket of fish comes down.'] },
            { label: 'He misses, and Ruby has to catch him', score: 2, reply: ['Ruby catches him in her arms, lace gown and all.', 'Ruby: “My hero.”', 'Cutlass: “Shush.”'] },
          ] },
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
        { text: 'Crispin paces the study with a magnifying glass.',
          lines: ['Crispin: “Crispinlock Holmes, at your service. Monsoon, you are my Dr. Watson.”', 'Jade: “And me!”', 'Crispin: “There was meant to be ONE assistant.”', 'Jade: “I insisted!”', 'Monsoon: “He did insist.”'],
          choices: [
            { label: 'Examine the window', score: 0, reply: ['Monsoon: “The latch was opened from the inside, sir.”', 'Crispin: “So the thief was already aboard. Elementary.”'] },
            { label: 'Examine the desk', score: 0, reply: ['Jade sniffs the desk. Loudly.', 'Jade: “Roses! The desk smells like roses.”', 'Crispin: “Rosewater. Expensive. Interesting.”'] },
            { label: 'Examine the floor', score: 0, reply: ['Monsoon: “Small wet footprints. Bare feet. Heading out to the rail.”'] },
          ] },
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

    { id: 'disguise', level: 1, kind: 'crew', from: 'tempest', title: 'Dress Up as a Lady', bg: 'ballroom', cast: ['tempest', 'cutlass', 'jade', 'monsoon'],
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
          lines: ['A girl pirate: “And who invited you?”'],
          choices: [
            { label: 'Jade compliments her cutlass', score: 2, reply: ['Jade: “That is a beautiful blade. Did you sharpen it yourself?”', 'She blushes. She did.'] },
            { label: 'Absalom offers a magic trick', score: 2, reply: ['Absalom pulls a coin from behind her ear. Then a fish. The girls are delighted.'] },
            { label: 'Stormcaller predicts the weather', score: 1, reply: ['Stormcaller: “Clear skies until midnight.” It starts to rain. Everyone laughs anyway.'] },
          ] },
        { text: 'The girl pirates are laughing and dancing. Nobody is watching the rest of the ship…',
          choices: [
            { label: 'Keep them dancing', score: 2, reply: ['Jade starts a conga line. The whole deck joins in.'] },
            { label: 'Start an arm-wrestling contest', score: 1, reply: ['Absalom loses to every single girl. They love him for it.'] },
            { label: 'Compliment their captain', score: 0, reply: ['A girl pirate: “Captain Evangeline? Don’t let her catch you here.” She glances nervously at the cabin.'] },
          ] },
        { text: 'Part two: cause a disaster. Ruby slips below decks while the party roars on. The chart is in Evangeline’s cabin.',
          choices: [
            { label: 'Light the fireworks in the powder room', score: 2, reply: ['BOOM. Green and pink sparks fill the sky. Evangeline’s crew scatters like chickens.'] },
            { label: 'Cut the anchor rope', score: 2, reply: ['The ship drifts lazily out to sea while the girls are still dancing.'] },
            { label: 'Release every chicken in the hold', score: 1, reply: ['Forty chickens. One ship. No order whatsoever.'] },
          ] },
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
        { text: 'The big romantic scene. Arabella and Bones have to hold hands.',
          choices: [
            { label: 'Say “Kiss!”', score: 1, reply: ['The boys roar and storm the stage to take over the play. Monsoon is now the princess.'] },
            { label: 'Say the princess deserves better', score: 1, reply: ['Scarlett: “She does!”', 'Bones: “HEY!” The actors start arguing on stage.'] },
            { label: 'Ask why the sea captain has a beard', score: 1, reply: ['Bones forgets his lines. Then forgets the beard. It falls off.'] },
          ] },
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

    { id: 'plank', level: 1, kind: 'plot', title: 'Walk the Plank', bg: 'rival', pass: 4, cast: ['cutlass', 'ruby'],
      hook: 'A shadow falls across the deck. Evangeline’s ship has come alongside, and her girl pirates are swinging aboard!',
      accept: 'Draw swords',
      beats: [
        { text: 'There are too many of them. Evangeline’s crew drags Cutlass onto a plank over the shark-filled sea.',
          lines: ['Evangeline: “Give me the chart, or your captain walks.”', 'Ruby: “He isn’t my captain.”', 'Cutlass: “Ruby!”', 'Ruby: “…He’s my Cutlass. And he isn’t walking anywhere.”'],
          choices: [
            { label: 'Cutlass does a backflip off the plank', score: 2, reply: ['He flips, catches a rope mid-air, and swings back onto the deck. The girl pirates gasp.'] },
            { label: 'Cutlass bounces on the plank', score: 1, reply: ['Boing. Boing. The girl pirate holding the plank loses her balance instead.'] },
            { label: 'Cutlass begs for mercy', score: 0, reply: ['Evangeline: “How sweet.” A girl pirate pokes him with a sword. He shuffles back to the edge.'] },
          ] },
        { text: 'Cutlass is back on deck, but surrounded.',
          choices: [
            { label: 'A swordfight, back to back with Ruby', score: 2, reply: ['Steel rings out. Ruby and Cutlass fight like they’ve done it a hundred times.'] },
            { label: 'Throw a smoke bomb', score: 2, reply: ['Purple smoke. Lots of coughing. When it clears, Cutlass is behind them.'] },
            { label: 'Tell a joke to distract them', score: 0, reply: ['Cutlass: “Why did the pirate…” Nobody laughs. Not even Ruby.'] },
          ] },
        { text: 'Evangeline herself steps forward, sword raised.',
          choices: [
            { label: 'Disarm her with a flick of the wrist', score: 2, reply: ['Her sword spins away into the sea. Evangeline snarls.'] },
            { label: 'Swing away on the rigging with Ruby', score: 2, reply: ['Cutlass scoops Ruby up and swings back to their own ship. The crew cheers.'] },
            { label: 'Challenge her to a dance-off', score: 0, reply: ['Evangeline does not dance. Evangeline pushes him toward the plank again.'] },
          ] },
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
        { text: 'Down they go. The water is green and full of light. Jade swims in circles because he can’t figure out steering.',
          choices: [
            { label: 'Follow the trail of bubbles', score: 2, reply: ['The bubbles lead to an old wreck. Something inside is glowing.'] },
            { label: 'Ask a passing turtle for directions', score: 2, reply: ['The turtle is very slow, but very helpful.'] },
            { label: 'Let Monsoon lead', score: 1, reply: ['Monsoon leads them into a kelp forest. Then out of it. Then back in.'] },
          ] },
        { text: 'The chest lies in the wreck. It is guarded by a very large, very grumpy octopus.',
          choices: [
            { label: 'Bones tickles the octopus', score: 2, reply: ['It turns out octopuses are very ticklish. Eight arms of giggling.'] },
            { label: 'Cutlass’s sisters sing it to sleep', score: 2, reply: ['A siren song. The octopus snores. So does Jade.'] },
            { label: 'Cutlass fights it', score: 1, reply: ['Cutlass vs. octopus. The octopus has more arms. Ruby swims past both of them and opens the chest.'] },
          ] },
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

    { id: 'rafting', level: 2, kind: 'plot', title: 'River Rafting in the Jungle', bg: 'river', pass: 4, cast: ['ruby', 'cutlass'],
      hook: 'The old master lives upriver, deep in the jungle. The only way there is by raft, and Oro says the river is “a bit lively.”',
      accept: 'Push off',
      beats: [
        { text: 'Ruby and Cutlass set off on a little bamboo raft. The jungle closes in, loud with birds. The river starts to speed up.',
          choices: [
            { label: 'Ruby steers, Cutlass paddles', score: 2, reply: ['Cutlass: “Why do I always paddle?”', 'Ruby: “Because you’re good at it.” He paddles harder.'] },
            { label: 'Both paddle', score: 1, reply: ['They paddle in opposite directions and spin in a slow circle.'] },
            { label: 'Cutlass steers', score: 0, reply: ['They hit a rock straight away. Cutlass: “That rock moved!”'] },
          ] },
        { text: 'Rapids! White water foams ahead, with a fallen log across the left channel.',
          choices: [
            { label: 'Take the right channel', score: 2, reply: ['They shoot through the rapids, soaked and laughing.'] },
            { label: 'Duck under the log', score: 1, reply: ['Ruby ducks. Cutlass doesn’t. Ruby fishes him back onto the raft.'] },
            { label: 'Go straight down the middle', score: 0, reply: ['Straight into a whirlpool. Round and round they go.'] },
          ] },
        { text: 'Crocodiles sunbathe on the bank. One opens a yellow eye.',
          choices: [
            { label: 'Drift quietly past', score: 2, reply: ['Not a sound. The crocodile goes back to sleep.'] },
            { label: 'Throw it Odessa’s packed lunch', score: 1, reply: ['The crocodile loves Odessa’s cooking. Everyone does.'] },
            { label: 'Cutlass stares it down', score: 0, reply: ['The crocodile wins the staring contest. And now it’s following them.'] },
          ] },
        { text: 'A waterfall! The roar is deafening.',
          choices: [
            { label: 'Grab the vines and swing to shore', score: 2, reply: ['Ruby grabs a vine. Cutlass grabs Ruby. They land in a heap on the bank as the raft goes over.'] },
            { label: 'Paddle for the bank', score: 1, reply: ['They make it, barely, and the raft goes over the falls without them.'] },
            { label: 'Ride it over', score: 0, reply: ['Cutlass: “I regret everything!” all the way down.'] },
          ] },
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
        { text: 'The opening. The master places a black stone in the corner.',
          choices: [
            { label: 'Answer patiently, in the far corner', score: 2, reply: ['The old master: “Good. You do not chase. You build.”'] },
            { label: 'Attack his stone right away', score: 0, reply: ['The old master: “Hasty. Like the Pirate King. He always attacks first.”'] },
            { label: 'Ask him about the Pirate King', score: 1, reply: ['The old master: “Play first. Talk later.”'] },
          ] },
        { text: 'The middle game. One of your groups of stones is almost surrounded.',
          choices: [
            { label: 'Give up the small group to save the big one', score: 2, reply: ['The old master: “Wise. The Pirate King never gives up anything. That is his weakness.”'] },
            { label: 'Fight for every stone', score: 1, reply: ['You lose the group, and the master nods. “Pride. He has much of it.”'] },
            { label: 'Quietly link your stones together', score: 2, reply: ['The old master: “Strength in connection. His fleet has none. They serve him out of fear.”'] },
          ] },
        { text: 'The end of the game. The board is nearly full. The old master sets down his last stone and looks up.',
          lines: ['The old master: “You play with a good heart. So I will tell you.”', 'The old master: “The Pirate King keeps the Dragon Seal on his flagship. His crews obey him only because he holds their freedom in chains. Free them, and he stands alone.”', 'The old master: “He will not expect you to fight with swords. Fight with whatever is at hand.”'] },
      ],
      ends: [[0, 'The old master bows. Ruby and Cutlass bow back. Now they know the Pirate King’s secret: free those in servitude, and he stands alone.']] },

    { id: 'mopwar', level: 2, kind: 'plot', final: true, item: 2, title: 'The Mop War', bg: 'eastern', pass: 5, cast: ['ruby', 'cutlass', 'oro', 'crispin', 'scarlett', 'tempest', 'jade', 'monsoon', 'bones'],
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
        { text: 'The battle spills into the rigging.',
          choices: [
            { label: 'Swing across and drop nets on them', score: 2, reply: ['Jade and Monsoon drop a cargo net over six of them at once.'] },
            { label: 'Tempest and Scarlett mop-fence', score: 2, reply: ['Tempest and Scarlett twirl their mops like swords. Nobody can get past. Nobody wants to.'] },
            { label: 'Crispin hides in a barrel', score: 1, reply: ['Crispin: “This is a tactical barrel.” It rolls away with him in it, knocking over three pirates.'] },
          ] },
        { text: 'Below decks on the flagship, Oro finds them: the sailors in servitude, chained to the oars.',
          choices: [
            { label: 'Break their chains', score: 2, reply: ['Oro: “You’re free! All of you!” The freed sailors rise, and they are FURIOUS with the Pirate King.'] },
            { label: 'Ask them to join the fight', score: 1, reply: ['They don’t need asking twice. Someone hands them mops.'] },
            { label: 'Leave them for later', score: 0, reply: ['Ruby: “No. We don’t leave anyone behind.” She goes back for them.'] },
          ] },
        { text: 'With his crews free and turning against him, the Pirate King stands alone on his flagship, the Dragon Seal in his fist.',
          choices: [
            { label: 'Ruby and Cutlass face him together', score: 2, reply: ['Mop and sword, side by side. The Pirate King backs up, step by step, until there’s nowhere left to go.'] },
            { label: 'Everyone throws their mops at once', score: 2, reply: ['A hundred mops fly through the air. The Pirate King disappears under them.'] },
            { label: 'Challenge him to a duel', score: 1, reply: ['He accepts, and he is very good. Ruby is better.'] },
          ] },
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
