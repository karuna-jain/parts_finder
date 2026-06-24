-- Motorcycle Parts Knowledge Platform - DML Import Script
-- Populates the complete Indian Two-Wheeler Brands, Models, Exploded Diagrams, and Parts Catalog

BEGIN;

-- Truncate tables to ensure a clean import
TRUNCATE TABLE compatibility CASCADE;
TRUNCATE TABLE part_relationships CASCADE;
TRUNCATE TABLE part_images CASCADE;
TRUNCATE TABLE kits CASCADE;
TRUNCATE TABLE parts CASCADE;
TRUNCATE TABLE exploded_diagrams CASCADE;
TRUNCATE TABLE systems CASCADE;
TRUNCATE TABLE models CASCADE;
TRUNCATE TABLE brands CASCADE;

-- 1. Insert Brands
INSERT INTO brands (id, name) VALUES 
(1, 'Hero'),
(2, 'Honda'),
(3, 'Bajaj'),
(4, 'TVS'),
(5, 'Yamaha'),
(6, 'Suzuki'),
(7, 'Royal Enfield'),
(8, 'KTM'),
(9, 'Jawa'),
(10, 'Yezdi'),
(11, 'Vespa'),
(12, 'Aprilia'),
(13, 'Ather'),
(14, 'Ola'),
(15, 'Chetak'),
(16, 'Vida');

-- 2. Insert Models (Mapping Brand -> Family -> Name -> Variant -> CC -> Year)
INSERT INTO models (id, brand_id, family, name, variant, cc, year) VALUES
-- Hero
(1, 1, 'Splendor Series', 'Splendor Plus', 'Standard', 100, 2024),
(2, 1, 'Splendor Series', 'Splendor Plus XTEC', 'Smart Bluetooth', 100, 2024),
(3, 1, 'Karizma Series', 'Karizma XMR', 'ABS Dual Channel', 210, 2024),
(4, 1, 'XPulse Series', 'XPulse 200 4V', 'Pro Edition', 200, 2023),
-- Honda
(5, 2, 'Shine Series', 'Shine 125', 'Drum Brake', 125, 2023),
(6, 2, 'Activa Series', 'Activa 6G', 'DLX H-Smart', 110, 2024),
-- Bajaj
(7, 3, 'Pulsar Series', 'Pulsar 150', 'Twin Disc', 150, 2023),
(8, 3, 'Pulsar Series', 'Pulsar NS200', 'Fi ABS', 200, 2024),
-- TVS
(9, 4, 'Apache Series', 'Apache RTR 160 4V', 'Special Edition', 160, 2024),
(10, 4, 'Jupiter Series', 'Jupiter 125', 'SmartXonnect', 125, 2023),
-- Royal Enfield
(11, 7, 'Classic Series', 'Classic 350', 'Signals Edition', 349, 2024),
(12, 7, 'Himalayan Series', 'Himalayan 450', 'Sherpa 450', 452, 2024),
-- KTM
(13, 8, 'Duke Series', 'Duke 390', 'ABS Gen-3', 399, 2024),
-- Ather (EV)
(14, 13, '450 Series', '450X', 'Pro Pack 3.7kWh', 0, 2024),
-- Ola (EV)
(15, 14, 'S1 Series', 'S1 Pro', 'Gen 2', 0, 2024),
-- Vida (EV)
(16, 16, 'Vida Series', 'Vida V1', 'Pro', 0, 2024);

-- 3. Insert Systems
INSERT INTO systems (id, name, description) VALUES
(1, 'Engine', 'IC Engine blocks, pistons, valve assemblies, and cylinder heads'),
(2, 'Fuel System', 'Carburetors, fuel injectors, throttle bodies, and fuel lines'),
(3, 'Electrical', 'Wiring harnesses, spark plugs, batteries, and switch gears'),
(4, 'Transmission', 'Drive chains, sprockets, and gear boxes'),
(5, 'Braking', 'Brake shoes, disc pads, calipers, and cylinders'),
(6, 'Suspension', 'Front shock forks and rear dampers'),
(7, 'Wheels & Tyres', 'Alloy rims, spokes, tubeless and tube tyres'),
(8, 'Body Parts', 'Fairings, panels, mudguards, and cowls'),
(9, 'Chassis', 'Main frames, swingarms, and stands'),
(10, 'Exhaust', 'Mufflers, catalytic converters, and heat shields'),
(11, 'Clutch', 'Clutch plates, friction discs, and assembly hubs'),
(12, 'Handlebar', 'Handlebars, grips, levers, and cables'),
(13, 'Lighting', 'Headlamps, tail lights, and indicators'),
(14, 'Cooling', 'Radiators, coolants, and water pumps');

-- 4. Insert Exploded Diagrams
INSERT INTO exploded_diagrams (id, name, svg_data, system_id, model_id) VALUES
(1, 'Splendor Plus Cylinder Head Assembly', 
 '<svg viewBox="0 0 800 500" class="w-full h-full text-slate-100"><rect x="0" y="0" width="800" height="500" fill="none" /><line x1="200" y1="150" x2="350" y2="250" stroke="#4f46e5" stroke-width="2" stroke-dasharray="4" /><line x1="450" y1="150" x2="380" y2="250" stroke="#4f46e5" stroke-width="2" stroke-dasharray="4" /><circle cx="380" cy="270" r="45" fill="none" stroke="#6366f1" stroke-width="3" /><circle cx="200" cy="150" r="18" fill="#4f46e5" /><text x="195" y="155" fill="white" font-weight="bold" font-size="14">1</text><circle cx="450" cy="150" r="18" fill="#a855f7" /><text x="445" y="155" fill="white" font-weight="bold" font-size="14">2</text><circle cx="380" cy="270" r="18" fill="#10b981" /><text x="375" y="275" fill="white" font-weight="bold" font-size="14">3</text><text x="340" y="340" fill="#94a3b8" font-size="12">Cylinder Head Block</text></svg>', 1, 1),
(2, 'Shine 125 Transmission sprocket',
 '<svg viewBox="0 0 800 500" class="w-full h-full text-slate-100"><rect x="0" y="0" width="800" height="500" fill="none" /><circle cx="250" cy="250" r="60" fill="none" stroke="#a855f7" stroke-width="3" /><circle cx="500" cy="250" r="40" fill="none" stroke="#a855f7" stroke-width="3" /><line x1="250" y1="190" x2="500" y2="210" stroke="#8b5cf6" stroke-width="2" /><line x1="250" y1="310" x2="500" y2="290" stroke="#8b5cf6" stroke-width="2" /><circle cx="250" cy="250" r="18" fill="#a855f7" /><text x="245" y="255" fill="white" font-weight="bold" font-size="14">4</text><circle cx="500" cy="250" r="18" fill="#6366f1" /><text x="495" y="255" fill="white" font-weight="bold" font-size="14">5</text><circle cx="375" cy="200" r="18" fill="#10b981" /><text x="370" y="205" fill="white" font-weight="bold" font-size="14">6</text></svg>', 4, 5);

-- 5. Insert Parts (Enriched with hierarchy, inventory, hotspots, superseded, and alternatives)
INSERT INTO parts (id, part_number, name, normalized_name, category, system_id, sub_system, confidence, mrp, quantity, is_kit, description, diagram_id, hotspot_number, oem_number, rack_location, reorder_level, supplier, last_purchase_date, last_purchase_price, dealer_price, sales_history, superseded_by, alternatives) VALUES
-- Spark Plug (Hotspot 1 in Diagram 1)
(1, '31917-AAC-H00', 'SPARK PLUG (NGK CPR7EA-9)', 'Spark Plug (ngk Cpr7ea-9)', 'Electrical', 3, 'Cylinder Head', 0.98, 115.00, 45, false, 'Genuine copper core spark plug designed for high reliability and clean combustion.', 1, 1, 'OEM-SPK-31917', 'RACK-B2', 10, 'NGK Spark Plugs India', '2026-05-10', 80.00, 95.00, '30,35,42,38,45,40,48,50,55,42,39,45', NULL, '31916-KPL-900,98056-57718'),
-- Cylinder Head Gasket (Hotspot 2 in Diagram 1)
(2, '12251-KCC-900', 'GASKET CYLINDER HEAD', 'Gasket Cylinder Head', 'Engine', 1, 'Cylinder Head', 0.95, 85.00, 60, false, 'High compression asbestos-free head gasket ensuring airtight block seal.', 1, 2, 'OEM-GST-12251', 'RACK-C1', 15, 'Talbros Automotive', '2026-06-01', 50.00, 68.00, '20,25,18,22,30,28,34,31,29,25,22,26', NULL, '12251-GB4-681'),
-- Cylinder Block (Hotspot 3 in Diagram 1)
(3, '12100-KSP-910', 'CYLINDER BLOCK BLOCK COMP', 'Cylinder Block Component', 'Engine', 1, 'Cylinder Head', 0.95, 1850.00, 8, false, 'Aluminium alloy cylinder block sleeve with cast iron liner.', 1, 3, 'OEM-CYL-12100', 'RACK-A3', 2, 'Hero Castings Ltd', '2026-04-15', 1300.00, 1550.00, '5,3,4,6,2,5,7,3,4,5,2,4', NULL, '12100-KCC-900'),
-- Drive Chain (Hotspot 6 in Diagram 2)
(4, '40530-KCC-900', 'DRIVE CHAIN 428-108L', 'Drive Chain 428-108l', 'Transmission', 4, 'Chain Drive', 0.95, 450.00, 22, false, 'Heavy-duty 428 pitch drive chain with 108 links for optimal power transfer.', 2, 6, 'OEM-CHN-40530', 'RACK-D4', 6, 'Rolon Chains India', '2026-05-20', 320.00, 390.00, '15,18,12,14,20,16,19,22,25,17,14,18', NULL, '40530-ABZ-00099'),
-- Drive Sprocket (Hotspot 5 in Diagram 2)
(5, '23801-KCC-900', 'DRIVE SPROCKET 14T', 'Drive Sprocket 14t', 'Transmission', 4, 'Chain Drive', 0.95, 120.00, 30, false, 'Front drive sprocket with 14 teeth, hardened steel.', 2, 5, 'OEM-FSP-23801', 'RACK-D5', 8, 'Rolon Chains India', '2026-05-20', 80.00, 100.00, '10,12,15,11,14,9,18,13,15,12,10,14', NULL, NULL),
-- Rear Driven Sprocket (Hotspot 4 in Diagram 2)
(6, '41201-KCC-900', 'FINAL DRIVEN SPROCKET 44T', 'Final Driven Sprocket 44t', 'Transmission', 4, 'Chain Drive', 0.95, 680.00, 14, false, 'Rear wheel chain driven sprocket with 44 teeth, zinc coated.', 2, 4, 'OEM-RSP-41201', 'RACK-D6', 4, 'Rolon Chains India', '2026-05-20', 490.00, 580.00, '8,7,9,11,10,6,12,9,10,8,7,11', NULL, NULL),
-- Clutch Plate Kit (Kit Part)
(7, '22201-KCC-900S', 'CLUTCH PLATE KIT', 'Clutch Plate Kit', 'Clutch', 11, 'Clutch Assembly', 0.95, 550.00, 18, true, 'Genuine clutch plate overhaul kit comprising friction plates and steel discs.', NULL, NULL, 'OEM-CLT-22201S', 'RACK-E1', 5, 'Fcc Co Clutch India', '2026-06-12', 380.00, 460.00, '12,15,18,16,22,14,19,21,24,18,15,17', NULL, '22201-KPM-850S'),
-- Clutch Friction Plate A
(8, '22201-KCC-900', 'CLUTCH FRICTION PLATE A', 'Clutch Friction Plate a', 'Clutch', 11, 'Clutch Assembly', 0.95, 110.00, 80, false, 'Individual clutch friction plate lining with advanced cork paper composite.', NULL, NULL, 'OEM-FPL-22201', 'RACK-E2', 20, 'Fcc Co Clutch India', '2026-06-12', 75.00, 92.00, '40,48,52,45,55,50,62,58,60,49,41,52', NULL, NULL),
-- Clutch Steel Plate
(9, '22311-KCC-900', 'CLUTCH STEEL PLATE', 'Clutch Steel Plate', 'Clutch', 11, 'Clutch Assembly', 0.95, 75.00, 60, false, 'Hardened steel separator clutch plate ensuring smooth gear engagement.', NULL, NULL, 'OEM-SPL-22311', 'RACK-E3', 15, 'Fcc Co Clutch India', '2026-06-12', 50.00, 62.00, '30,35,40,32,45,39,48,44,42,37,32,40', NULL, NULL),
-- Brake Shoe Kit
(10, '06430-KCC-900', 'BRAKE SHOE KIT', 'Brake Shoe Kit', 'Braking', 5, 'Drum Brake Assembly', 0.95, 220.00, 40, true, 'Front/Rear brake shoe expander kit with high heat resistance.', NULL, NULL, 'OEM-BRK-06430', 'RACK-F2', 10, 'Ask Brake Linings', '2026-06-18', 150.00, 185.00, '25,28,32,30,38,34,42,40,45,35,30,36', NULL, '43125-KCC-900S'),
-- Spark Plug (Royal Enfield Classic 350)
(11, 'WR7DDC4', 'SPARK PLUG DUAL ELECTRODE (BOSCH)', 'Spark Plug Bosch Dual Electrode', 'Electrical', 3, 'Cylinder Head', 0.97, 180.00, 35, false, 'Dual electrode spark plug for twin-spark Classic 350 engine blocks.', NULL, NULL, 'RE-SPK-WR7DDC', 'RACK-B3', 8, 'Bosch India', '2026-05-15', 120.00, 150.00, '15,18,22,20,25,22,26,28,30,24,20,23', NULL, '31917-AAC-H00'),
-- Brake Pads Front (KTM Duke 390 / Pulsar NS200)
(12, 'DT151000', 'FRONT DISC PAD KIT (BREMBO)', 'Front Disc Brake Pad Brembo', 'Braking', 5, 'Disc Caliper Assembly', 0.98, 950.00, 12, false, 'Sintered front disc brake pads by Brembo offering superior bite.', NULL, NULL, 'KTM-BRK-DT151000', 'RACK-F4', 4, 'Brembo India', '2026-06-05', 680.00, 800.00, '6,8,5,7,9,11,8,10,12,7,6,9', NULL, 'KBX-DP-7401'),
-- Alternator Assembly (Ola S1 Pro)
(13, 'OLA-50123-GEN2', 'STATOR ASSEMBLY MODULE', 'Ola Stator Assembly Gen 2', 'Electrical', 3, 'Motor Assembly', 0.96, 4200.00, 3, false, 'Ola S1 Pro Gen-2 copper coil stator module for PMSM hub motor.', NULL, NULL, 'OLA-STTR-50123', 'RACK-H2', 1, 'Ola Electric Spares', '2026-03-10', 3100.00, 3700.00, '2,1,2,0,1,2,3,1,2,1,0,2', NULL, NULL);

-- 6. Insert Kits
INSERT INTO kits (id, part_id, kit_number, name) VALUES
(1, 7, '22201-KCC-900S', 'Clutch Plate Kit'),
(2, 10, '06430-KCC-900', 'Brake Shoe Kit');

-- 7. Insert Part Images
INSERT INTO part_images (id, part_id, image_url) VALUES
(1, 1, 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=400&q=80'),
(2, 4, 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=400&q=80'),
(3, 7, 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=400&q=80');

-- 8. Insert Part Relationships (mapping Parent Kit Part to Child Component Parts)
INSERT INTO part_relationships (id, kit_id, parent_part_id, child_part_id, quantity) VALUES
-- Clutch Plate Kit -> Clutch Friction Plate A (Needs 4 plates)
(1, 1, 7, 8, 4),
-- Clutch Plate Kit -> Clutch Steel Plate (Needs 3 plates)
(2, 1, 7, 9, 3);

-- 9. Insert Compatibility (Maps Part to Model)
INSERT INTO compatibility (id, part_id, model_id) VALUES
-- Spark Plug (31917-AAC-H00) is compatible with Splendor Plus, Splendor XTEC, Shine 125, Activa 6G, Pulsar 150
(1, 1, 1),
(2, 1, 2),
(3, 1, 5),
(4, 1, 6),
(5, 1, 7),
-- Gasket Cylinder Head (12251-KCC-900) is compatible with Splendor Plus and Splendor XTEC
(6, 2, 1),
(7, 2, 2),
-- Cylinder Block Component (12100-KSP-910) is compatible with Splendor Plus
(8, 3, 1),
-- Drive Chain 428-108L is compatible with Splendor Plus, Shine 125, Pulsar 150
(9, 4, 1),
(10, 4, 5),
(11, 4, 7),
-- Drive Sprocket 14T compatible with Shine 125
(12, 5, 5),
-- Final Driven Sprocket 44T compatible with Shine 125
(13, 6, 5),
-- Clutch Plate Kit compatible with Splendor Plus, Splendor XTEC
(14, 7, 1),
(15, 7, 2),
-- Royal Enfield Bosch dual electrode spark plug is compatible with RE Classic 350, RE Himalayan
(16, 11, 11),
(17, 11, 12),
-- Brembo brake pads compatible with KTM Duke 390, Pulsar NS200
(18, 12, 13),
(19, 12, 8),
-- Ola stator alternator module compatible with Ola S1 Pro
(20, 13, 15);

COMMIT;
