
-- Seed machines (idempotent)
INSERT INTO public.machines (name, kind, vendor, model, build_volume_mm, nozzles, hourly_cost, power_watts, status, active, specs)
VALUES
  ('Bambu X1-Carbon #1', 'printer', 'Bambu Lab', 'X1-Carbon', '{"x":256,"y":256,"z":256}'::jsonb, '["0.2","0.4","0.6","0.8"]'::jsonb, 3.50, 1000, 'idle', true, '{"heated_chamber":true,"ams":true,"max_hotend_c":300}'::jsonb),
  ('Bambu X1-Carbon #2', 'printer', 'Bambu Lab', 'X1-Carbon', '{"x":256,"y":256,"z":256}'::jsonb, '["0.2","0.4","0.6","0.8"]'::jsonb, 3.50, 1000, 'idle', true, '{"heated_chamber":true,"ams":true,"max_hotend_c":300}'::jsonb),
  ('Bambu X1-Carbon #3', 'printer', 'Bambu Lab', 'X1-Carbon', '{"x":256,"y":256,"z":256}'::jsonb, '["0.2","0.4","0.6","0.8"]'::jsonb, 3.50, 1000, 'idle', true, '{"heated_chamber":true,"ams":true,"max_hotend_c":300}'::jsonb),
  ('AKJ Fiber Laser 3015', 'laser', 'AKJ', 'FL-3015-3kW', '{"x":3000,"y":1500,"z":0}'::jsonb, NULL, 45.00, 12000, 'idle', true, '{"power_kw":3,"materials":["steel","stainless","aluminum","brass","copper"],"max_thickness_mm":20}'::jsonb),
  ('Durmapress Press Brake', 'press_brake', 'Durmapress', 'AD-R 30160', NULL, NULL, 32.00, 15000, 'idle', true, '{"tonnage":160,"length_mm":3000}'::jsonb),
  ('TOREO Welding Station', 'welding', 'Lincoln Electric', 'PowerMIG 260', NULL, NULL, 28.00, 8000, 'idle', true, '{"processes":["MIG","TIG","stick"]}'::jsonb),
  ('CNC Milling Center', 'cnc', 'Haas', 'VF-2SS', '{"x":762,"y":406,"z":508}'::jsonb, NULL, 55.00, 22000, 'idle', true, '{"spindle_rpm":12000,"tool_changer":24}'::jsonb)
ON CONFLICT DO NOTHING;

-- Seed materials (idempotent, unique on code)
INSERT INTO public.materials (code, name, family, process, color, price_per_kg, density_g_cm3, stock_kg, properties, active)
VALUES
  ('PLA-BLK',  'PLA Black',       'PLA',   '3d_printing', 'black',  25.00, 1.24, 25.0, '{"strength":"medium","temp_c":60,"printability":"excellent"}'::jsonb, true),
  ('PLA-WHT',  'PLA White',       'PLA',   '3d_printing', 'white',  25.00, 1.24, 20.0, '{"strength":"medium","temp_c":60,"printability":"excellent"}'::jsonb, true),
  ('PLA-GRY',  'PLA Grey',        'PLA',   '3d_printing', 'grey',   25.00, 1.24, 15.0, '{"strength":"medium","temp_c":60,"printability":"excellent"}'::jsonb, true),
  ('PLAP-BLK', 'PLA+ Black (tough)', 'PLA+', '3d_printing', 'black', 32.00, 1.24, 10.0, '{"strength":"high","temp_c":65,"printability":"excellent","tough":true}'::jsonb, true),
  ('ABS-BLK',  'ABS Black',       'ABS',   '3d_printing', 'black',  30.00, 1.04, 12.0, '{"strength":"high","temp_c":95,"printability":"medium","warp":"high"}'::jsonb, true),
  ('PETG-BLK', 'PETG Black',      'PETG',  '3d_printing', 'black',  35.00, 1.27,  8.0, '{"strength":"high","temp_c":75,"printability":"good","chemical_resistant":true}'::jsonb, true),
  ('PETG-CLR', 'PETG Clear',      'PETG',  '3d_printing', 'clear',  38.00, 1.27,  5.0, '{"strength":"high","temp_c":75,"printability":"good"}'::jsonb, true),
  ('TPU-95A',  'TPU 95A Flexible','TPU',   '3d_printing', 'black',  45.00, 1.21,  3.0, '{"strength":"flex","shore":"95A","printability":"medium"}'::jsonb, true),
  ('PC-BLK',   'Polycarbonate Black','PC', '3d_printing', 'black',  70.00, 1.20,  3.0, '{"strength":"very_high","temp_c":115,"printability":"hard","requires_chamber":true}'::jsonb, true),
  ('PA-CF',    'Nylon CF (Carbon)','PA-CF','3d_printing', 'black',  95.00, 1.15,  2.0, '{"strength":"very_high","stiffness":"very_high","printability":"hard","abrasive":true}'::jsonb, true),
  ('STEEL-S235','Mild Steel S235', 'steel','laser',       'natural', 1.20, 7.85, 500.0, '{"max_thickness_mm":15,"weldable":true}'::jsonb, true),
  ('STEEL-304','Stainless 304',    'stainless','laser',   'natural', 4.80, 8.00, 300.0, '{"max_thickness_mm":10,"corrosion":"high"}'::jsonb, true),
  ('AL-5083', 'Aluminum 5083',     'aluminum','laser',    'natural', 6.50, 2.66, 200.0, '{"max_thickness_mm":10,"weldable":true,"marine":true}'::jsonb, true),
  ('AL-6061', 'Aluminum 6061',     'aluminum','cnc',      'natural', 8.00, 2.70, 150.0, '{"machinability":"excellent","hardness":"medium"}'::jsonb, true)
ON CONFLICT (code) DO NOTHING;
