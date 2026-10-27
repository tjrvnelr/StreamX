insert into public.categories (name, slug) values
  ('Documentary', 'documentary'),
  ('Travel', 'travel'),
  ('Nature', 'nature'),
  ('Design', 'design'),
  ('Music', 'music'),
  ('Short films', 'short-films'),
  ('Food', 'food'),
  ('Culture', 'culture')
on conflict (slug) do nothing;
