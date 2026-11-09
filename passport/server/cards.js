// Card bank. `GLOBAL` cards should be recognisable to most people anywhere;
// each country pack holds things that people from that country will know
// well but others may not. A room's deck mixes the two based on who joined
// (see deck.js).
//
// To add a country: add an entry to COUNTRIES and a matching array to PACKS.

export const COUNTRIES = {
  AU: { name: 'Australia', flag: '🇦🇺' },
  BR: { name: 'Brazil', flag: '🇧🇷' },
  CA: { name: 'Canada', flag: '🇨🇦' },
  FR: { name: 'France', flag: '🇫🇷' },
  DE: { name: 'Germany', flag: '🇩🇪' },
  IN: { name: 'India', flag: '🇮🇳' },
  IT: { name: 'Italy', flag: '🇮🇹' },
  JP: { name: 'Japan', flag: '🇯🇵' },
  MX: { name: 'Mexico', flag: '🇲🇽' },
  NG: { name: 'Nigeria', flag: '🇳🇬' },
  PH: { name: 'Philippines', flag: '🇵🇭' },
  ZA: { name: 'South Africa', flag: '🇿🇦' },
  KR: { name: 'South Korea', flag: '🇰🇷' },
  ES: { name: 'Spain', flag: '🇪🇸' },
  GB: { name: 'United Kingdom', flag: '🇬🇧' },
  US: { name: 'United States', flag: '🇺🇸' },
};

// Players from anywhere not listed above pick this; they get global cards.
export const OTHER = 'XX';

export const GLOBAL = [
  // People
  'Albert Einstein', 'Cristiano Ronaldo', 'Lionel Messi', 'Taylor Swift', 'Michael Jackson',
  'Beyoncé', 'Shakira', 'Elon Musk', 'Barack Obama', 'Mahatma Gandhi', 'Nelson Mandela',
  'Leonardo da Vinci', 'Marie Curie', 'Usain Bolt', 'Serena Williams', 'Roger Federer',
  'Queen Elizabeth II', 'Charlie Chaplin', 'Bruce Lee', 'Jackie Chan', 'Steve Jobs',
  'Bill Gates', 'Mark Zuckerberg', 'Pablo Picasso', 'William Shakespeare', 'Mozart',
  'Elvis Presley', 'The Beatles', 'BTS', 'Adele', 'Ed Sheeran', 'Rihanna', 'Justin Bieber',
  'Lady Gaga', 'Bob Marley', 'Muhammad Ali', 'Michael Jordan', 'Neil Armstrong', 'Cleopatra',
  'Napoleon', 'Isaac Newton', 'Charles Darwin', 'Frida Kahlo', 'Santa Claus', 'Mona Lisa',
  // Films, shows & characters
  'Harry Potter', 'Titanic', 'Star Wars', 'Spider-Man', 'Batman', 'Superman', 'Frozen',
  'The Lion King', 'James Bond', 'Mickey Mouse', 'Pikachu', 'Super Mario', 'Shrek', 'Avatar',
  'Jurassic Park', 'Squid Game', 'Sherlock Holmes', 'Barbie', 'Toy Story', 'Finding Nemo',
  'The Avengers', 'Godzilla', 'Dracula', 'Minions', 'SpongeBob SquarePants', 'Tom and Jerry',
  'Game of Thrones', 'The Simpsons', 'Pinocchio', 'Cinderella', 'Tarzan', 'King Kong',
  // Places
  'Eiffel Tower', 'Great Wall of China', 'Statue of Liberty', 'Taj Mahal', 'Pyramids of Giza',
  'Mount Everest', 'Sahara Desert', 'Amazon Rainforest', 'Niagara Falls', 'Colosseum',
  'Machu Picchu', 'Antarctica', 'Hollywood', 'Las Vegas', 'Venice', 'Grand Canyon',
  'Stonehenge', 'Dubai', 'Disneyland', 'Bermuda Triangle', 'North Pole', 'The Moon', 'Mars',
  'Leaning Tower of Pisa', 'Big Ben', 'Sydney Opera House', 'Christ the Redeemer', 'Mount Fuji',
  // Food & drink
  'Pizza', 'Sushi', 'Hamburger', 'Chocolate', 'Popcorn', 'Ice cream', 'Spaghetti', 'Coffee',
  'Pancake', 'French fries', 'Avocado', 'Watermelon', 'Croissant', 'Taco', 'Hot dog',
  'Birthday cake', 'Honey', 'Cheese', 'Banana', 'Pineapple', 'Noodles', 'Dumplings', 'Coconut',
  // Brands & tech
  'Coca-Cola', "McDonald's", 'Google', 'Instagram', 'TikTok', 'WhatsApp', 'YouTube', 'iPhone',
  'Netflix', 'Amazon', 'Lego', "Rubik's Cube", 'Wi-Fi', 'Selfie', 'Emoji', 'Bitcoin',
  'Password', 'Internet', 'Podcast', 'Influencer', 'Social media',
  // Sport & events
  'Olympics', 'FIFA World Cup', 'Chess', 'Karate', 'Surfing', 'Skateboard', 'Marathon',
  'Penalty kick', 'Tennis', 'Basketball', 'Golf', 'Boxing', 'Yoga', 'Wedding', 'Halloween',
  "Valentine's Day", "New Year's Eve", 'Christmas tree', 'Fireworks',
  // Animals & creatures
  'Dinosaur', 'Penguin', 'Giraffe', 'Kangaroo', 'Elephant', 'Octopus', 'Shark', 'Butterfly',
  'Unicorn', 'Dragon', 'Vampire', 'Zombie', 'Robot', 'Alien', 'Pirate', 'Ninja', 'Mermaid',
  'Ghost',
  // Jobs & places
  'Astronaut', 'Detective', 'Magician', 'Firefighter', 'Dentist', 'Teacher', 'Chef',
  'Library', 'Hospital', 'Airport', 'Zoo', 'Museum', 'Jungle', 'Island', 'Lighthouse',
  // Things & ideas
  'Passport', 'Umbrella', 'Rollercoaster', 'Treadmill', 'Microwave', 'Toothbrush',
  'Sunglasses', 'Headphones', 'Bicycle', 'Helicopter', 'Submarine', 'Volcano', 'Rainbow',
  'Earthquake', 'Tsunami', 'Lightning', 'Snowman', 'Time machine', 'Black hole', 'Gravity',
  'Alarm clock', 'Traffic jam', 'Hiccups', 'Jet lag', 'Sneeze', 'Homework', 'Karaoke',
  'Sleepwalking', 'Hide and seek', 'Rock paper scissors', 'Thumbs up', 'Bucket list',
  'Lottery', 'Tattoo', 'Camping', 'Sunburn',
];

export const PACKS = {
  US: [
    'Thanksgiving', 'Super Bowl', 'Fourth of July', 'Abraham Lincoln', 'George Washington',
    'Mount Rushmore', 'Times Square', 'Golden Gate Bridge', 'The White House', 'Route 66',
    'Yellowstone', 'Martin Luther King Jr.', 'Walmart', 'Starbucks', 'Taco Bell',
    'Mac and cheese', 'Peanut butter and jelly', 'Apple pie', 'Buffalo wings', 'Root beer',
    'NBA', 'Baseball', 'Tom Brady', 'LeBron James', 'Kim Kardashian', 'Dwayne Johnson',
    'The Office', 'Saturday Night Live', 'Breaking Bad', 'Disney World', 'Black Friday',
    'Uncle Sam', 'Groundhog Day', 'Prom', 'Spring break', 'Yard sale', 'Tailgate party',
    'Wall Street', 'Dollar store',
  ],
  GB: [
    'Buckingham Palace', 'Tower Bridge', 'London Underground', 'Double-decker bus',
    'Fish and chips', 'Sunday roast', 'Full English breakfast', 'Yorkshire pudding', 'Marmite',
    'Tea and biscuits', 'Scones', 'Harry Styles', 'David Beckham', 'King Charles',
    'Princess Diana', 'Mr. Bean', 'Doctor Who', 'Coronation Street', 'EastEnders',
    'Peaky Blinders', 'The Great British Bake Off', 'Wimbledon', 'Premier League',
    'Glastonbury', 'Bonfire Night', 'Boxing Day', 'Loch Ness Monster', 'Edinburgh', 'Oasis',
    'Spice Girls', 'The Crown', 'Pub quiz', 'Gordon Ramsay', 'Cadbury', 'Tesco', 'Black cab',
    'Robin Hood',
  ],
  IN: [
    'Bollywood', 'Shah Rukh Khan', 'Amitabh Bachchan', 'Sachin Tendulkar', 'Virat Kohli',
    'MS Dhoni', 'IPL', 'Diwali', 'Holi', 'Ganesh Chaturthi', 'Biryani', 'Butter chicken',
    'Pani puri', 'Masala chai', 'Dosa', 'Samosa', 'Gulab jamun', 'Vada pav', 'Auto rickshaw',
    'Indian Railways', 'Gateway of India', 'Kerala backwaters', 'Goa', 'Sholay', '3 Idiots',
    'RRR', 'Dilwale Dulhania Le Jayenge', 'Kaun Banega Crorepati', 'Bigg Boss', 'A. R. Rahman',
    'Lata Mangeshkar', 'Chandrayaan', 'Rangoli', 'Mehendi', 'Dabbawala', 'Lagaan',
  ],
  CA: [
    'Maple syrup', 'Poutine', 'Tim Hortons', 'Wayne Gretzky', 'CN Tower', 'Banff', 'Mountie',
    'Moose', 'Beaver', 'Celine Dion', 'Drake', 'Justin Trudeau', 'Ryan Reynolds', 'Canada Day',
    'Toonie', 'Loonie', 'Nanaimo bar', 'Butter tart', 'Ketchup chips', 'Double-double',
    "Schitt's Creek", 'Canadian Tire', 'Toque', 'Toronto Raptors', 'Montreal bagel',
    'Ice wine', 'Polar bear', 'Shania Twain', 'Avril Lavigne', 'The Weeknd',
    'Quebec Winter Carnival', 'Stanley Cup', 'Hockey Night in Canada',
  ],
  AU: [
    'Vegemite', 'Tim Tam', 'Meat pie', 'Lamington', 'Pavlova', 'Sausage sizzle',
    'Sydney Harbour Bridge', 'Uluru', 'Great Barrier Reef', 'Bondi Beach', 'Koala', 'Wombat',
    'Emu', 'Crocodile Dundee', 'Steve Irwin', 'Hugh Jackman', 'Kylie Minogue',
    'Nicole Kidman', 'Chris Hemsworth', 'Margot Robbie', 'Neighbours', 'Bluey', 'The Wiggles',
    'AFL', 'Melbourne Cup', 'The Ashes', 'ANZAC Day', 'Boomerang', 'Didgeridoo', 'Esky', 'Ute',
    'The Outback', 'Fairy bread', 'Drop bear',
  ],
  BR: [
    'Carnival', 'Samba', 'Pelé', 'Neymar', 'Ronaldinho', 'Maracanã', 'Copacabana',
    'Sugarloaf Mountain', 'Feijoada', 'Pão de queijo', 'Brigadeiro', 'Açaí', 'Caipirinha',
    'Guaraná', 'Coxinha', 'Churrasco', 'Havaianas', 'Capoeira', 'Bossa nova',
    'The Girl from Ipanema', 'Anitta', 'Gisele Bündchen', 'Ayrton Senna', 'Xuxa', 'Novela',
    'Festa Junina', 'Iguaçu Falls', 'Pix', 'Turma da Mônica', 'Seleção', 'Brasília',
  ],
  MX: [
    'Día de los Muertos', 'Mariachi', 'Piñata', 'Lucha libre', 'Tacos al pastor', 'Guacamole',
    'Tamales', 'Mole', 'Churros', 'Elote', 'Tequila', 'Chichén Itzá', 'Cancún',
    'El Chavo del Ocho', 'Luis Miguel', 'Selena', 'Thalía', 'Salma Hayek',
    'Guillermo del Toro', 'Canelo Álvarez', 'Quinceañera', 'Sombrero', 'Aztec calendar',
    'Teotihuacán', 'La Llorona', 'Lotería', 'Telenovela', 'Cantinflas', 'Coco',
    'Rosca de Reyes', 'Virgin of Guadalupe', 'Chapulines',
  ],
  DE: [
    'Oktoberfest', 'Bratwurst', 'Pretzel', 'Sauerkraut', 'Black Forest cake', 'Currywurst',
    'Döner kebab', 'Berlin Wall', 'Brandenburg Gate', 'Neuschwanstein Castle', 'Autobahn',
    'Volkswagen Beetle', 'Bundesliga', 'Bayern Munich', 'Michael Schumacher', 'Angela Merkel',
    'Heidi Klum', 'Rammstein', 'Christmas market', 'Lederhosen', 'Brothers Grimm',
    'Advent calendar', 'Tatort', 'Kraftwerk', 'Sandmännchen', 'Haribo', 'Adidas', 'Karneval',
    'Pfand', 'Feierabend', 'Apfelschorle', 'Spätzle', 'Dirk Nowitzki', 'Thomas Müller',
  ],
  FR: [
    'Baguette', 'Escargot', 'Crêpe', 'Macaron', 'Ratatouille', 'Champagne', 'Brie', 'Louvre',
    'Arc de Triomphe', 'Mont Saint-Michel', 'Palace of Versailles', 'Notre-Dame',
    'Tour de France', 'Bastille Day', 'Zinedine Zidane', 'Kylian Mbappé', 'Édith Piaf',
    'Coco Chanel', 'Asterix', 'The Little Prince', 'Les Misérables', 'Amélie', 'Daft Punk',
    'Beret', 'Mime', 'French Riviera', 'Cannes Film Festival', 'Roland-Garros', 'Peugeot',
    'Galette des rois', 'Pétanque', 'Marie Antoinette', 'Jules Verne', 'Victor Hugo',
    'Moulin Rouge',
  ],
  ES: [
    'Paella', 'Tapas', 'Churros con chocolate', 'Jamón', 'Gazpacho', 'Tortilla española',
    'Sangria', 'Flamenco', 'Running of the Bulls', 'La Tomatina', 'Sagrada Família',
    'Alhambra', 'Park Güell', 'Real Madrid', 'FC Barcelona', 'El Clásico', 'Rafael Nadal',
    'Andrés Iniesta', 'Antonio Banderas', 'Penélope Cruz', 'Enrique Iglesias', 'Rosalía',
    'Money Heist', 'Don Quixote', 'Salvador Dalí', 'Siesta', 'Camino de Santiago', 'Ibiza',
    'Las Fallas', 'Three Kings Day', 'Twelve grapes at midnight', 'Pedro Almodóvar', 'Zara',
    'Fernando Alonso',
  ],
  IT: [
    'Pizza margherita', 'Lasagna', 'Tiramisu', 'Gelato', 'Risotto', 'Espresso', 'Cappuccino',
    'Carbonara', 'Prosecco', 'Parmesan', 'Gondola', 'Vatican', 'Sistine Chapel', 'Pompeii',
    'Amalfi Coast', 'Lake Como', 'Ferrari', 'Vespa', 'Fiat 500', 'Juventus', 'AC Milan',
    'Serie A', 'Andrea Bocelli', 'Luciano Pavarotti', 'Sophia Loren', 'Dante', 'Galileo',
    'Michelangelo', 'Romeo and Juliet', 'Måneskin', 'Sanremo Festival', 'Nutella',
    'Ferragosto', 'La Befana', 'Valentino Rossi',
  ],
  JP: [
    'Ramen', 'Tempura', 'Onigiri', 'Mochi', 'Matcha', 'Bento', 'Takoyaki', 'Sake',
    'Shinkansen', 'Shibuya Crossing', 'Tokyo Tower', 'Cherry blossom', 'Kimono', 'Sumo',
    'Samurai', 'Geisha', 'Origami', 'Anime', 'Naruto', 'Dragon Ball', 'One Piece',
    'Studio Ghibli', 'Spirited Away', 'Totoro', 'Hello Kitty', 'Doraemon', 'Nintendo',
    'Shohei Ohtani', 'Vending machine', 'Capsule hotel', 'Onsen', 'Haiku', 'Golden Week',
    'Pachinko', 'Konbini',
  ],
  KR: [
    'Kimchi', 'Bibimbap', 'Korean BBQ', 'Tteokbokki', 'Soju', 'Bulgogi', 'K-pop', 'Blackpink',
    'Gangnam Style', 'Parasite', 'K-drama', 'Crash Landing on You', 'Son Heung-min', 'Samsung',
    'Hyundai', 'Hanbok', 'Taekwondo', 'Chuseok', 'Seollal', 'Gyeongbokgung Palace',
    'N Seoul Tower', 'Jeju Island', 'PC bang', 'Noraebang', 'Fan death', 'KakaoTalk',
    'Webtoon', 'Mukbang', 'Running Man', 'Banchan',
  ],
  NG: [
    'Jollof rice', 'Suya', 'Pounded yam', 'Egusi soup', 'Puff-puff', 'Chin chin', 'Dodo',
    'Zobo', 'Nollywood', 'Afrobeats', 'Burna Boy', 'Wizkid', 'Davido', 'Tems', 'Fela Kuti',
    'Chinua Achebe', 'Things Fall Apart', 'Wole Soyinka', 'Super Eagles', 'Jay-Jay Okocha',
    'Danfo bus', 'Okada', 'Lagos', 'Third Mainland Bridge', 'Aso Rock', 'Owambe party',
    'Aso ebi', 'Gele', 'Agbada', 'NEPA', 'Big Brother Naija', 'Olumo Rock', 'Funke Akindele',
    'Chimamanda Ngozi Adichie',
  ],
  PH: [
    'Jollibee', 'Adobo', 'Lechon', 'Sinigang', 'Halo-halo', 'Balut', 'Pancit', 'Lumpia',
    'Jeepney', 'Tricycle', 'Boracay', 'Chocolate Hills', 'Banaue Rice Terraces',
    'Manny Pacquiao', 'Lea Salonga', 'Pia Wurtzbach', 'Miss Universe', 'Videoke',
    'Simbang Gabi', 'Parol', 'Sari-sari store', 'Balikbayan box', 'Mano po', 'Tinikling',
    'Eat Bulaga', 'Darna', 'Mayon Volcano', 'Taho', 'Barong Tagalog', 'PBA', 'Teleserye',
    'Fiesta',
  ],
  ZA: [
    'Braai', 'Biltong', 'Bobotie', 'Bunny chow', 'Boerewors', 'Koeksister', 'Rooibos tea',
    'Table Mountain', 'Robben Island', 'Kruger National Park', 'The Big Five', 'Springboks',
    'Rugby World Cup', 'Bafana Bafana', 'Siya Kolisi', 'Trevor Noah', 'Charlize Theron',
    'Miriam Makeba', 'Vuvuzela', 'Load shedding', 'Taxi rank', 'Soweto', 'Cape of Good Hope',
    'Amapiano', 'Kwaito', 'Desmond Tutu', 'Lekker', 'Robot (traffic light)', 'Durban July',
    'Madiba shirt', 'Boulders Beach penguins',
  ],
};
