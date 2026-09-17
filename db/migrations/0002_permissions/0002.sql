PRAGMA foreign_keys=ON;

ALTER TABLE permission_titles ADD COLUMN code TEXT;
ALTER TABLE permission_titles ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE permission_titles ADD COLUMN system INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_permission_titles_code ON permission_titles(code);

DELETE FROM position_permissions;
DELETE FROM permission_titles;

INSERT INTO permission_titles(code,name,description,system) VALUES
('CAL','View Calendar','Access the member calendar.',1),
('PHV','View Photos','View and download member photos.',1),
('DOCV','View Documents','Access member documents.',1),
('LDV','View Member Leadership','View member-only leadership holders.',1),
('HSTV','View Leadership History','View member-only leadership history.',1),
('SET','Settings','Access and edit personal settings.',1),
('MIV','View Member Info','View the member information area.',1),
('MIE','Edit Member Info','Create and edit member records.',1),
('MDEL','Delete Members','Delete member records.',1),
('INV','Invite Accounts','Create account invitations for members.',1),
('ACCT','Manage Account Logins','Change or delete account logins.',1),
('EML','View Email','Access the troop email page.',1),
('EMS','Send Email','Generate troop mailing links.',1),
('EVT','Manage Calendar','Create, edit, and delete calendar events.',1),
('ATTV','View Attendance','View attendance records.',1),
('ATTM','Manage Attendance','Confirm and edit attendance records.',1),
('SIGN','Sign Digital Permissions','Submit digital permission forms for connected Scouts.',1),
('PHOTO','Manage Photos','Upload, caption, and delete photos.',1),
('DOC','Manage Documents','Upload and delete documents.',1),
('EAGLE','Manage Eagle Scouts','Create and edit Eagle Scout records.',1),
('LEAD','Manage Leadership','Manage leadership positions and current holders.',1),
('HIST','Manage Leadership History','Manage SPL, ASPL, and Scoutmaster history.',1),
('ADV','Manage Advancement','Manage advancement requirements and links.',1),
('CAMP','Manage Summer Camp','Manage Summer Camp content and documents.',1),
('UNIF','Manage Uniform','Manage uniform images and insignia information.',1),
('HOME','Manage Homepage','Manage homepage content.',1),
('CONT','Manage Contact','Manage Contact Us content.',1),
('POS','Manage Positions','Create, edit, and remove configurable positions.',1),
('PMAP','Manage Position Permissions','Assign permissions to positions.',1),
('PERM','Manage Permissions','Create, edit, and remove permissions.',1),
('ADMIN','Administration','Access the Administration dashboard.',1);

INSERT OR IGNORE INTO positions(name,category) VALUES
('Guest','other'),
('Youth','youth'),
('Adult','adult');

INSERT OR IGNORE INTO position_permissions(position_id,permission_id)
SELECT p.id, x.id
FROM positions p
CROSS JOIN permission_titles x
WHERE p.name='Scoutmaster'
  AND x.code IN (
    'CAL','PHV','DOCV','LDV','HSTV','SET','MIV','MIE','MDEL',
    'INV','ACCT','EML','EMS','EVT',
    'ATTV','ATTM','SIGN','PHOTO','DOC',
    'EAGLE','LEAD','HIST','ADV','CAMP',
    'UNIF','HOME','CONT','POS',
    'PMAP','PERM','ADMIN'
  );

INSERT OR IGNORE INTO position_permissions(position_id,permission_id)
SELECT p.id, x.id
FROM positions p
CROSS JOIN permission_titles x
WHERE p.name='Youth'
  AND x.code IN ('CAL','PHV','DOCV','LDV','HSTV','SET','SIGN');

INSERT OR IGNORE INTO position_permissions(position_id,permission_id)
SELECT p.id, x.id
FROM positions p
CROSS JOIN permission_titles x
WHERE p.name='Adult'
  AND x.code IN ('CAL','PHV','DOCV','LDV','HSTV','SET','SIGN');
