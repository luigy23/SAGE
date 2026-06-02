-- Migration: add_catedra_visitante_tc_mt
-- Adds CATEDRA_VISITANTE_TC and CATEDRA_VISITANTE_MT to the Modalidad enum.
-- These mirror VISITANTE_TC / VISITANTE_MT in every rule (Art. 4e): same weekly
-- hours (40 / 20), non-strict semester cap and 60% docencia minimum. The new
-- values exist only to make the distinction visible per Decanatura's request.
--
-- We only ADD values (nothing is renamed or removed), so a plain ALTER TYPE
-- ADD VALUE is enough — no rename+recreate dance is required. Placed BEFORE
-- 'INVITADO' to keep the DB enum order aligned with prisma/schema.prisma.

ALTER TYPE "Modalidad" ADD VALUE IF NOT EXISTS 'CATEDRA_VISITANTE_TC' BEFORE 'INVITADO';
ALTER TYPE "Modalidad" ADD VALUE IF NOT EXISTS 'CATEDRA_VISITANTE_MT' BEFORE 'INVITADO';
