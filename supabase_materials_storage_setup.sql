-- Execute uma vez no Supabase: SQL Editor > New query > Run.
-- Cria o bucket de imagens dos materiais e restringe cada usuário à sua própria pasta.

insert into storage.buckets (id, name, public)
values ('materials-images', 'materials-images', false)
on conflict (id) do nothing;

drop policy if exists "Ler as proprias imagens de materiais" on storage.objects;
create policy "Ler as proprias imagens de materiais"
on storage.objects for select
to authenticated
using (bucket_id = 'materials-images' and (select auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists "Enviar as proprias imagens de materiais" on storage.objects;
create policy "Enviar as proprias imagens de materiais"
on storage.objects for insert
to authenticated
with check (bucket_id = 'materials-images' and (select auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists "Atualizar as proprias imagens de materiais" on storage.objects;
create policy "Atualizar as proprias imagens de materiais"
on storage.objects for update
to authenticated
using (bucket_id = 'materials-images' and (select auth.uid())::text = (storage.foldername(name))[1])
with check (bucket_id = 'materials-images' and (select auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists "Apagar as proprias imagens de materiais" on storage.objects;
create policy "Apagar as proprias imagens de materiais"
on storage.objects for delete
to authenticated
using (bucket_id = 'materials-images' and (select auth.uid())::text = (storage.foldername(name))[1]);
