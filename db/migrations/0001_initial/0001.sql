PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prefix TEXT DEFAULT '', first_name TEXT NOT NULL, middle_name TEXT DEFAULT '', last_name TEXT NOT NULL, suffix TEXT DEFAULT '',
  gender TEXT NOT NULL CHECK(gender IN ('Male','Female')),
  adult INTEGER NOT NULL DEFAULT 0, adult_leader INTEGER NOT NULL DEFAULT 0,
  rank TEXT DEFAULT '', dob TEXT, phone TEXT DEFAULT '', email TEXT DEFAULT '', street TEXT DEFAULT '', town TEXT DEFAULT '', zip TEXT DEFAULT '',
  join_date TEXT, cub_scout_pack TEXT DEFAULT '', patrol TEXT DEFAULT '', email_default_opt_out INTEGER NOT NULL DEFAULT 0,
  scouting_membership_id TEXT DEFAULT '', registration_expiration TEXT, syt_expiration TEXT, oa_member INTEGER NOT NULL DEFAULT 0,
  eagle_scout_archive INTEGER NOT NULL DEFAULT 0, archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, person_id INTEGER UNIQUE, username TEXT UNIQUE NOT NULL, password_hash TEXT, password_salt TEXT,
  active INTEGER NOT NULL DEFAULT 0, invite_token_hash TEXT, invite_expires_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(person_id) REFERENCES people(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, token_hash TEXT UNIQUE NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, category TEXT NOT NULL CHECK(category IN ('youth','adult','other'))
);
CREATE TABLE IF NOT EXISTS person_positions (person_id INTEGER NOT NULL, position_id INTEGER NOT NULL, custom_name TEXT DEFAULT '', PRIMARY KEY(person_id,position_id), FOREIGN KEY(person_id) REFERENCES people(id) ON DELETE CASCADE, FOREIGN KEY(position_id) REFERENCES positions(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS permission_titles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS position_permissions (position_id INTEGER NOT NULL, permission_id INTEGER NOT NULL, PRIMARY KEY(position_id,permission_id), FOREIGN KEY(position_id) REFERENCES positions(id) ON DELETE CASCADE, FOREIGN KEY(permission_id) REFERENCES permission_titles(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS family_relationships (person_id INTEGER NOT NULL, related_person_id INTEGER NOT NULL, role TEXT NOT NULL CHECK(role IN ('Parent','Guardian','Sibling')), PRIMARY KEY(person_id,related_person_id,role), FOREIGN KEY(person_id) REFERENCES people(id) ON DELETE CASCADE, FOREIGN KEY(related_person_id) REFERENCES people(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT DEFAULT '', start_at TEXT NOT NULL, end_at TEXT, all_day INTEGER NOT NULL DEFAULT 0, leader_person_id INTEGER, uniform TEXT DEFAULT '', estimated_cost TEXT DEFAULT '', location TEXT DEFAULT '', departure_location TEXT DEFAULT '', return_location TEXT DEFAULT '', history_member_only INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(leader_person_id) REFERENCES people(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS event_attendance (event_id INTEGER NOT NULL, person_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'Attending' CHECK(status IN ('Attending','Present','Absent','Excused','Late')), marked_by INTEGER, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(event_id,person_id), FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE, FOREIGN KEY(person_id) REFERENCES people(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS documents (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '', storage_key TEXT, external_url TEXT, visibility TEXT NOT NULL DEFAULT 'member' CHECK(visibility IN ('public','member','admin')), source_type TEXT DEFAULT 'standalone', source_id INTEGER, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS event_documents (event_id INTEGER NOT NULL, document_id INTEGER NOT NULL, PRIMARY KEY(event_id,document_id), FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE, FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS photos (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER NOT NULL, storage_key TEXT NOT NULL, caption TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS eagles (id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL, middle_name TEXT DEFAULT '', last_name TEXT NOT NULL, suffix TEXT DEFAULT '', eagle_number INTEGER NOT NULL, eagle_year INTEGER NOT NULL, eighteenth_birthday TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS leadership_positions (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, description TEXT DEFAULT '', public_visible INTEGER NOT NULL DEFAULT 1, visible_order INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS leadership_holders (leadership_position_id INTEGER NOT NULL, person_id INTEGER NOT NULL, PRIMARY KEY(leadership_position_id,person_id), FOREIGN KEY(leadership_position_id) REFERENCES leadership_positions(id) ON DELETE CASCADE, FOREIGN KEY(person_id) REFERENCES people(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS leadership_history (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL CHECK(type IN ('SPL','ASPL','Scoutmaster')), person_name TEXT NOT NULL, start_year INTEGER NOT NULL, end_year INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS advancement_requirements (id INTEGER PRIMARY KEY AUTOINCREMENT, rank TEXT NOT NULL, requirement_name TEXT NOT NULL, video_url TEXT DEFAULT '', visible_order INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS knots (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, video_url TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS awards (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, url TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS summer_camp (id INTEGER PRIMARY KEY CHECK(id=1), description TEXT DEFAULT '', merit_badges TEXT DEFAULT '', costs TEXT DEFAULT '', deadlines TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS uniform_key (id INTEGER PRIMARY KEY AUTOINCREMENT, image_area TEXT NOT NULL, number INTEGER NOT NULL, label TEXT NOT NULL, UNIQUE(image_area,number));
CREATE TABLE IF NOT EXISTS site_content (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS permission_forms (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER NOT NULL, parent_person_id INTEGER NOT NULL, scout_person_id INTEGER NOT NULL, signature TEXT NOT NULL, signed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, pdf_storage_key TEXT, FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE, FOREIGN KEY(parent_person_id) REFERENCES people(id) ON DELETE CASCADE, FOREIGN KEY(scout_person_id) REFERENCES people(id) ON DELETE CASCADE);

INSERT OR IGNORE INTO permission_titles(name) VALUES ('Admin'),('Adult Leader'),('Adult'),('Youth'),('Guest'),('Youth Leader');
INSERT OR IGNORE INTO positions(name,category) VALUES
('Senior Patrol Leader','youth'),('Assistant Senior Patrol Leader','youth'),('Troop Guide','youth'),('Den Chief','youth'),('Scribe','youth'),('Quartermaster','youth'),('Librarian','youth'),('Historian','youth'),('Bugler','youth'),('Chaplain Aide','youth'),('Instructor','youth'),('Webmaster','youth'),('Outdoor Ethics Guide','youth'),('OA Representative','youth'),('Junior Assistant Scoutmaster','youth'),
('Executive Officer','adult'),('Chartered Organization Representative','adult'),('Committee Chair','adult'),('Scoutmaster','adult'),('Assistant Scoutmaster','adult'),('Committee Member','adult'),('Secretary','adult'),('Treasurer','adult'),('Outdoor Activities Coordinator','adult'),('Advancement Coordinator','adult'),('Training Coordinator','adult'),('Equipment Coordinator','adult'),('Membership Coordinator','adult'),('Public Relations Coordinator','adult'),('High Adventure Coordinator','adult'),('Health and Safety Coordinator','adult'),('Fundraising Coordinator','adult'),('Transportation Coordinator','adult'),('Summer Camp Coordinator','adult'),('Religious Emblems Coordinator','adult'),('Chaplain','adult'),('Scout Moderator','adult'),('Merit Badge Counselor','adult');
INSERT OR IGNORE INTO leadership_positions(name,description,public_visible) VALUES ('Senior Patrol Leader','',1),('Assistant Senior Patrol Leader','',1),('Scoutmaster','',1);
INSERT OR IGNORE INTO knots(name) VALUES ('Square Knot'),('Two Half-Hitches'),('Taut-Line Hitch'),('Sheet Bend Knot'),('Bowline Knot'),('Clove Hitch'),('Timber Hitch');
INSERT OR IGNORE INTO awards(name) VALUES
('Catholic Religious Emblems'),
('All Religious Emblems'),
('Totin'' Chip'),
('Firem''n Chit'),
('Recruiter Strip'),
('Interpreter Strip'),
('National Outdoor Awards'),
('National Honor Patrol');
INSERT OR IGNORE INTO summer_camp(id) VALUES (1);
INSERT OR IGNORE INTO site_content(key,value) VALUES ('history',''),('troop_photo',''),('uniform_class_a',''),('uniform_class_b',''),('uniform_right_sleeve',''),('uniform_left_sleeve',''),('uniform_right_pocket',''),('uniform_left_pocket',''),('ahmr_template','');
