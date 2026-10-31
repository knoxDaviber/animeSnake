// assets/ads/ads_data.js: the madlib parts for the fake ads. See README.md in this folder.
const AD_DATA = {
  names: ['{adj} {thing}', 'The {adj} {thing}', '{thing} {suffix}', '{adj} {thing} {suffix}'],
  lines: [
    'Now with {feature}.',
    '{name}: because {reason}.',
    'Finally, {thing} for {audience}.',
    'Ask your doctor if {name} is right for {audience}.',
    '{feature}. {feature}. You are welcome.',
    'Buy {name} today. Or do not. We will know.',
  ],
  reviews: ['"{quote}" - {reviewer}', '"{quote}" - {reviewer}, probably'],
  fine: ['{disclaimer}', 'Results may vary. {disclaimer}', '{disclaimer} {disclaimer}'],
  images: ['ad1.jpg', 'fish.png', 'stonks.png', 'dog.png', 'toaster.png'],   // files in this folder (png, jpg, gif), e.g. ['sample.png']. Empty = text-only ads
  parts: {
    adj: ['Mega', 'Totally Real', 'Gently Used', 'Artisanal', 'Quantum', 'Haunted', 'Premium', 'Budget', 'Turbo', 'Organic', 'Sentient', 'Legally Distinct'],
    thing: ['Mattress', 'Antivirus', 'Soup', 'Sock Club', 'Hamster Wheel', 'Wi-Fi', 'Umbrella', 'Toaster', 'Pillow', 'Insurance', 'Dog Food', 'Cloud Storage'],
    suffix: ['Pro', 'Max', 'Ultra', '9000', 'Plus', 'Deluxe', 'Lite', 'for Fish'],
    feature: ['extra corners', 'zero calories', 'a free trial of a trial', 'blockchain', 'tiny wings', 'organic pixels', '3% more tail', 'a smell'],
    reason: ['you deserve it', 'gravity is not enough', 'the tiles demanded it', 'nobody asked', 'it fits the grid'],
    audience: ['snakes', 'busy tiles', 'people with tails', 'hamsters', 'anime enthusiasts', 'fish', 'your future self'],
    quote: ['I bought two and one bought me', 'Best thing since the tail stall', 'My dog loved it, my dog is a snake', 'Changed my life, mostly the left side', 'Would eat again'],
    reviewer: ['A Satisfied Tile', 'Mom', 'The Hazard', 'Definitely Not The Dev', 'Medusa', 'A Key'],
    disclaimer: ['Not a real product.', 'Side effects include pixels.', 'Do not eat the hazard.', 'Void where prohibited by physics.', 'No snakes were harmed. Several were annoyed.'],
  },
};