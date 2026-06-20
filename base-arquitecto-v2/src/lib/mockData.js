const now = new Date().toISOString();
const hace = (dias) => new Date(Date.now() - dias * 86400000).toISOString();

const CLIENTES = [
  { id_cliente: 'c1', tipo: 'PERSONA', nombre: 'María Fernández', documento: '8-987-654', correo: 'maria@email.com', telefono: '6000-1111', telefono_alt: '', direccion: 'Vía España, Panamá', notas: '', activo: true, created_at: hace(30), created_by: null },
  { id_cliente: 'c2', tipo: 'EMPRESA', nombre: 'Constructora Pérez S.A.', documento: '123456-1-789', correo: 'info@constructoraperez.com', telefono: '6000-2222', telefono_alt: '', direccion: 'Calle 50, Edif. Business', notas: 'Cliente VIP', activo: true, created_at: hace(25), created_by: null },
  { id_cliente: 'c3', tipo: 'PERSONA', nombre: 'Carlos Gómez', documento: '3-456-789', correo: 'cgomez@email.com', telefono: '6000-3333', telefono_alt: '', direccion: 'El Cangrejo', notas: '', activo: true, created_at: hace(20), created_by: null },
  { id_cliente: 'c4', tipo: 'EMPRESA', nombre: 'Grupo Inmobiliario del Istmo', documento: '987654-2-321', correo: 'contacto@istmo.com', telefono: '6000-4444', telefono_alt: '', direccion: 'Costa del Este', notas: '', activo: true, created_at: hace(15), created_by: null },
  { id_cliente: 'c5', tipo: 'PERSONA', nombre: 'Ana Castillo', documento: '2-111-222', correo: 'ana.c@email.com', telefono: '6000-5555', telefono_alt: '', direccion: '', notas: '', activo: true, created_at: hace(10), created_by: null },
];

const PROYECTOS = [
  { id_proyecto: 'p1', numero_proyecto: 'P-0001', id_cliente: 'c1', nombre: 'Residencia Familiar Altos del Golf', descripcion: 'Casa de 280m2 en urbanización cerrada', estado: 'EN_CURSO', moneda: 'PAB', fecha_inicio: '2026-01-15', fecha_fin_est: '2026-09-30', monto_total: 185000.00, pagado_total: 74000.00, avance_pct: 45.00, pago_pct: 40.00, notas: '', created_at: hace(45), created_by: null },
  { id_proyecto: 'p2', numero_proyecto: 'P-0002', id_cliente: 'c2', nombre: 'Torre Corporativa 50', descripcion: 'Edificio de oficinas de 12 pisos', estado: 'COTIZACION', moneda: 'PAB', fecha_inicio: null, fecha_fin_est: null, monto_total: 2500000.00, pagado_total: 0, avance_pct: 0, pago_pct: 0, notas: 'En espera de aprobación del cliente', created_at: hace(20), created_by: null },
  { id_proyecto: 'p3', numero_proyecto: 'P-0003', id_cliente: 'c3', nombre: 'Remodelación Penthouse', descripcion: 'Remodelación completa de penthouse 200m2', estado: 'EN_CURSO', moneda: 'PAB', fecha_inicio: '2026-03-01', fecha_fin_est: '2026-07-15', monto_total: 95000.00, pagado_total: 47500.00, avance_pct: 55.00, pago_pct: 50.00, notas: '', created_at: hace(15), created_by: null },
  { id_proyecto: 'p4', numero_proyecto: 'P-0004', id_cliente: 'c4', nombre: 'Centro Comercial Brisas', descripcion: 'Centro comercial de 5000m2', estado: 'EN_CURSO', moneda: 'PAB', fecha_inicio: '2026-02-01', fecha_fin_est: '2027-06-30', monto_total: 350000.00, pagado_total: 105000.00, avance_pct: 25.00, pago_pct: 30.00, notas: '', created_at: hace(10), created_by: null },
  { id_proyecto: 'p5', numero_proyecto: 'P-0005', id_cliente: 'c5', nombre: 'Casa Playa Coronado', descripcion: 'Casa vacacional 150m2 frente al mar', estado: 'FINALIZADO', moneda: 'PAB', fecha_inicio: '2025-08-01', fecha_fin_est: '2026-03-30', monto_total: 210000.00, pagado_total: 210000.00, avance_pct: 100.00, pago_pct: 100.00, notas: 'Proyecto completado satisfactoriamente', created_at: hace(60), created_by: null },
  { id_proyecto: 'p6', numero_proyecto: 'P-0006', id_cliente: 'c2', nombre: 'Ampliación Bodega Industrial', descripcion: 'Ampliación de 800m2 de bodega', estado: 'COTIZACION', moneda: 'PAB', fecha_inicio: null, fecha_fin_est: null, monto_total: 120000.00, pagado_total: 0, avance_pct: 0, pago_pct: 0, notas: '', created_at: hace(5), created_by: null },
  { id_proyecto: 'p7', numero_proyecto: 'P-0007', id_cliente: 'c3', nombre: 'Oficina Boutique', descripcion: 'Diseño de oficina ejecutiva 80m2', estado: 'EN_CURSO', moneda: 'PAB', fecha_inicio: '2026-05-01', fecha_fin_est: '2026-08-15', monto_total: 35000.00, pagado_total: 17500.00, avance_pct: 40.00, pago_pct: 50.00, notas: '', created_at: hace(3), created_by: null },
  { id_proyecto: 'p8', numero_proyecto: 'P-0008', id_cliente: 'c1', nombre: 'Jardines Verticales', descripcion: 'Diseño de fachada verde para edificio residencial', estado: 'PAUSADO', moneda: 'PAB', fecha_inicio: '2026-04-01', fecha_fin_est: '2026-06-30', monto_total: 28000.00, pagado_total: 14000.00, avance_pct: 65.00, pago_pct: 50.00, notas: 'Pausado por modificaciones del cliente', created_at: hace(2), created_by: null },
];

const ETAPAS = [
  { id_etapa: 'e1', id_proyecto: 'p1', nombre: 'Diseño', tipo: 'DISENO', orden: 0, peso_pct: 30, avance_pct: 100, monto_total: 55500.00, pagado_total: 55500.00 },
  { id_etapa: 'e2', id_proyecto: 'p1', nombre: 'Obra', tipo: 'OBRA', orden: 1, peso_pct: 70, avance_pct: 21.43, monto_total: 129500.00, pagado_total: 18500.00 },
  { id_etapa: 'e3', id_proyecto: 'p3', nombre: 'Diseño', tipo: 'DISENO', orden: 0, peso_pct: 25, avance_pct: 100, monto_total: 23750.00, pagado_total: 23750.00 },
  { id_etapa: 'e4', id_proyecto: 'p3', nombre: 'Obra', tipo: 'OBRA', orden: 1, peso_pct: 75, avance_pct: 40, monto_total: 71250.00, pagado_total: 23750.00 },
  { id_etapa: 'e5', id_proyecto: 'p4', nombre: 'Diseño', tipo: 'DISENO', orden: 0, peso_pct: 15, avance_pct: 100, monto_total: 52500.00, pagado_total: 52500.00 },
  { id_etapa: 'e6', id_proyecto: 'p4', nombre: 'Obra', tipo: 'OBRA', orden: 1, peso_pct: 85, avance_pct: 11.76, monto_total: 297500.00, pagado_total: 52500.00 },
  { id_etapa: 'e7', id_proyecto: 'p5', nombre: 'Diseño', tipo: 'DISENO', orden: 0, peso_pct: 30, avance_pct: 100, monto_total: 63000.00, pagado_total: 63000.00 },
  { id_etapa: 'e8', id_proyecto: 'p5', nombre: 'Obra', tipo: 'OBRA', orden: 1, peso_pct: 70, avance_pct: 100, monto_total: 147000.00, pagado_total: 147000.00 },
  { id_etapa: 'e9', id_proyecto: 'p7', nombre: 'Diseño', tipo: 'DISENO', orden: 0, peso_pct: 40, avance_pct: 100, monto_total: 14000.00, pagado_total: 14000.00 },
  { id_etapa: 'e10', id_proyecto: 'p7', nombre: 'Obra', tipo: 'OBRA', orden: 1, peso_pct: 60, avance_pct: 0, monto_total: 21000.00, pagado_total: 3500.00 },
  { id_etapa: 'e11', id_proyecto: 'p8', nombre: 'Diseño', tipo: 'DISENO', orden: 0, peso_pct: 100, avance_pct: 65, monto_total: 28000.00, pagado_total: 14000.00 },
];

const SUBETAPAS = [
  { id_subetapa: 's1', id_etapa: 'e1', nombre: 'Conceptualización', orden: 0, peso_pct: 30, monto: 16650.00, avance_pct: 100, pagado: 16650.00, pago_pct: 100 },
  { id_subetapa: 's2', id_etapa: 'e1', nombre: 'Desarrollo de planos', orden: 1, peso_pct: 50, monto: 27750.00, avance_pct: 100, pagado: 27750.00, pago_pct: 100 },
  { id_subetapa: 's3', id_etapa: 'e1', nombre: 'Aprobación', orden: 2, peso_pct: 20, monto: 11100.00, avance_pct: 100, pagado: 11100.00, pago_pct: 100 },
  { id_subetapa: 's4', id_etapa: 'e2', nombre: 'Excavación', orden: 0, peso_pct: 15, monto: 19425.00, avance_pct: 100, pagado: 18500.00, pago_pct: 95.2 },
  { id_subetapa: 's5', id_etapa: 'e2', nombre: 'Estructura', orden: 1, peso_pct: 40, monto: 51800.00, avance_pct: 20, pagado: 0, pago_pct: 0 },
  { id_subetapa: 's6', id_etapa: 'e2', nombre: 'Acabados', orden: 2, peso_pct: 30, monto: 38850.00, avance_pct: 0, pagado: 0, pago_pct: 0 },
  { id_subetapa: 's7', id_etapa: 'e2', nombre: 'Instalaciones', orden: 3, peso_pct: 15, monto: 19425.00, avance_pct: 0, pagado: 0, pago_pct: 0 },
  { id_subetapa: 's8', id_etapa: 'e3', nombre: 'Conceptualización', orden: 0, peso_pct: 30, monto: 7125.00, avance_pct: 100, pagado: 7125.00, pago_pct: 100 },
  { id_subetapa: 's9', id_etapa: 'e3', nombre: 'Desarrollo de planos', orden: 1, peso_pct: 50, monto: 11875.00, avance_pct: 100, pagado: 11875.00, pago_pct: 100 },
  { id_subetapa: 's10', id_etapa: 'e3', nombre: 'Aprobación', orden: 2, peso_pct: 20, monto: 4750.00, avance_pct: 100, pagado: 4750.00, pago_pct: 100 },
  { id_subetapa: 's11', id_etapa: 'e4', nombre: 'Demolición', orden: 0, peso_pct: 10, monto: 7125.00, avance_pct: 100, pagado: 7125.00, pago_pct: 100 },
  { id_subetapa: 's12', id_etapa: 'e4', nombre: 'Pisos y paredes', orden: 1, peso_pct: 40, monto: 28500.00, avance_pct: 60, pagado: 16625.00, pago_pct: 58.3 },
  { id_subetapa: 's13', id_etapa: 'e4', nombre: 'Cocina', orden: 2, peso_pct: 25, monto: 17812.50, avance_pct: 20, pagado: 0, pago_pct: 0 },
  { id_subetapa: 's14', id_etapa: 'e4', nombre: 'Baños', orden: 3, peso_pct: 25, monto: 17812.50, avance_pct: 0, pagado: 0, pago_pct: 0 },
  { id_subetapa: 's15', id_etapa: 'e5', nombre: 'Conceptualización', orden: 0, peso_pct: 30, monto: 15750.00, avance_pct: 100, pagado: 15750.00, pago_pct: 100 },
  { id_subetapa: 's16', id_etapa: 'e5', nombre: 'Desarrollo de planos', orden: 1, peso_pct: 50, monto: 26250.00, avance_pct: 100, pagado: 26250.00, pago_pct: 100 },
  { id_subetapa: 's17', id_etapa: 'e5', nombre: 'Aprobación', orden: 2, peso_pct: 20, monto: 10500.00, avance_pct: 100, pagado: 10500.00, pago_pct: 100 },
  { id_subetapa: 's18', id_etapa: 'e6', nombre: 'Movimiento de tierra', orden: 0, peso_pct: 10, monto: 29750.00, avance_pct: 100, pagado: 29750.00, pago_pct: 100 },
  { id_subetapa: 's19', id_etapa: 'e6', nombre: 'Cimentación', orden: 1, peso_pct: 20, monto: 59500.00, avance_pct: 50, pagado: 22750.00, pago_pct: 38.2 },
  { id_subetapa: 's20', id_etapa: 'e6', nombre: 'Estructura', orden: 2, peso_pct: 35, monto: 104125.00, avance_pct: 0, pagado: 0, pago_pct: 0 },
  { id_subetapa: 's21', id_etapa: 'e6', nombre: 'Techos', orden: 3, peso_pct: 20, monto: 59500.00, avance_pct: 0, pagado: 0, pago_pct: 0 },
  { id_subetapa: 's22', id_etapa: 'e6', nombre: 'Instalaciones', orden: 4, peso_pct: 15, monto: 44625.00, avance_pct: 0, pagado: 0, pago_pct: 0 },
  { id_subetapa: 's23', id_etapa: 'e7', nombre: 'Conceptualización', orden: 0, peso_pct: 30, monto: 18900.00, avance_pct: 100, pagado: 18900.00, pago_pct: 100 },
  { id_subetapa: 's24', id_etapa: 'e7', nombre: 'Desarrollo de planos', orden: 1, peso_pct: 50, monto: 31500.00, avance_pct: 100, pagado: 31500.00, pago_pct: 100 },
  { id_subetapa: 's25', id_etapa: 'e7', nombre: 'Aprobación', orden: 2, peso_pct: 20, monto: 12600.00, avance_pct: 100, pagado: 12600.00, pago_pct: 100 },
  { id_subetapa: 's26', id_etapa: 'e8', nombre: 'Estructura', orden: 0, peso_pct: 50, monto: 73500.00, avance_pct: 100, pagado: 73500.00, pago_pct: 100 },
  { id_subetapa: 's27', id_etapa: 'e8', nombre: 'Acabados', orden: 1, peso_pct: 30, monto: 44100.00, avance_pct: 100, pagado: 44100.00, pago_pct: 100 },
  { id_subetapa: 's28', id_etapa: 'e8', nombre: 'Instalaciones', orden: 2, peso_pct: 20, monto: 29400.00, avance_pct: 100, pagado: 29400.00, pago_pct: 100 },
  { id_subetapa: 's29', id_etapa: 'e9', nombre: 'Conceptualización', orden: 0, peso_pct: 30, monto: 4200.00, avance_pct: 100, pagado: 4200.00, pago_pct: 100 },
  { id_subetapa: 's30', id_etapa: 'e9', nombre: 'Desarrollo de planos', orden: 1, peso_pct: 50, monto: 7000.00, avance_pct: 100, pagado: 7000.00, pago_pct: 100 },
  { id_subetapa: 's31', id_etapa: 'e9', nombre: 'Aprobación', orden: 2, peso_pct: 20, monto: 2800.00, avance_pct: 100, pagado: 2800.00, pago_pct: 100 },
  { id_subetapa: 's32', id_etapa: 'e10', nombre: 'Remodelación', orden: 0, peso_pct: 100, monto: 21000.00, avance_pct: 0, pagado: 3500.00, pago_pct: 16.7 },
  { id_subetapa: 's33', id_etapa: 'e11', nombre: 'Diseño conceptual', orden: 0, peso_pct: 40, monto: 11200.00, avance_pct: 100, pagado: 11200.00, pago_pct: 100 },
  { id_subetapa: 's34', id_etapa: 'e11', nombre: 'Planos ejecutivos', orden: 1, peso_pct: 40, monto: 11200.00, avance_pct: 70, pagado: 2800.00, pago_pct: 25 },
  { id_subetapa: 's35', id_etapa: 'e11', nombre: 'Render 3D', orden: 2, peso_pct: 20, monto: 5600.00, avance_pct: 0, pagado: 0, pago_pct: 0 },
];

const PAGOS = [
  { id_pago: 'pay1', id_proyecto: 'p1', id_subetapa: 's1', numero_recibo: 'R-0001', monto: 16650.00, metodo_pago: 'TRANSFERENCIA', fecha: '2026-01-20', nota: 'Pago inicial diseño', anulado: false, anulado_motivo: null, created_at: hace(40), created_by: null },
  { id_pago: 'pay2', id_proyecto: 'p1', id_subetapa: 's2', numero_recibo: 'R-0002', monto: 27750.00, metodo_pago: 'TRANSFERENCIA', fecha: '2026-02-15', nota: '', anulado: false, anulado_motivo: null, created_at: hace(35), created_by: null },
  { id_pago: 'pay3', id_proyecto: 'p1', id_subetapa: 's3', numero_recibo: 'R-0003', monto: 11100.00, metodo_pago: 'TRANSFERENCIA', fecha: '2026-03-01', nota: '', anulado: false, anulado_motivo: null, created_at: hace(30), created_by: null },
  { id_pago: 'pay4', id_proyecto: 'p1', id_subetapa: 's4', numero_recibo: 'R-0004', monto: 18500.00, metodo_pago: 'CHEQUE', fecha: '2026-03-20', nota: 'Pago excavación', anulado: false, anulado_motivo: null, created_at: hace(25), created_by: null },
  { id_pago: 'pay5', id_proyecto: 'p3', id_subetapa: 's8', numero_recibo: 'R-0005', monto: 7125.00, metodo_pago: 'TRANSFERENCIA', fecha: '2026-03-05', nota: '', anulado: false, anulado_motivo: null, created_at: hace(12), created_by: null },
  { id_pago: 'pay6', id_proyecto: 'p3', id_subetapa: null, numero_recibo: 'R-0006', monto: 10000.00, metodo_pago: 'EFECTIVO', fecha: '2026-03-10', nota: 'Anticipo', anulado: false, anulado_motivo: null, created_at: hace(11), created_by: null },
  { id_pago: 'pay7', id_proyecto: 'p3', id_subetapa: 's9', numero_recibo: 'R-0007', monto: 11875.00, metodo_pago: 'TRANSFERENCIA', fecha: '2026-04-01', nota: '', anulado: false, anulado_motivo: null, created_at: hace(8), created_by: null },
  { id_pago: 'pay8', id_proyecto: 'p3', id_subetapa: 's12', numero_recibo: 'R-0008', monto: 16625.00, metodo_pago: 'TRANSFERENCIA', fecha: '2026-05-01', nota: '', anulado: false, anulado_motivo: null, created_at: hace(5), created_by: null },
  { id_pago: 'pay9', id_proyecto: 'p4', id_subetapa: null, numero_recibo: 'R-0009', monto: 30000.00, metodo_pago: 'TRANSFERENCIA', fecha: '2026-02-05', nota: 'Anticipo obra', anulado: false, anulado_motivo: null, created_at: hace(8), created_by: null },
  { id_pago: 'pay10', id_proyecto: 'p5', id_subetapa: 's23', numero_recibo: 'R-0010', monto: 18900.00, metodo_pago: 'TRANSFERENCIA', fecha: '2025-08-15', nota: '', anulado: false, anulado_motivo: null, created_at: hace(55), created_by: null },
  { id_pago: 'pay11', id_proyecto: 'p7', id_subetapa: null, numero_recibo: 'R-0011', monto: 5000.00, metodo_pago: 'TRANSFERENCIA', fecha: '2026-05-05', nota: 'Anticipo', anulado: false, anulado_motivo: null, created_at: hace(2), created_by: null },
  { id_pago: 'pay12', id_proyecto: 'p8', id_subetapa: 's33', numero_recibo: 'R-0012', monto: 11200.00, metodo_pago: 'EFECTIVO', fecha: '2026-04-05', nota: '', anulado: false, anulado_motivo: null, created_at: hace(1), created_by: null },
  { id_pago: 'pay13', id_proyecto: 'p8', id_subetapa: 's34', numero_recibo: 'R-0013', monto: 2800.00, metodo_pago: 'EFECTIVO', fecha: '2026-05-10', nota: '', anulado: false, anulado_motivo: null, created_at: hace(1), created_by: null },
  { id_pago: 'pay14', id_proyecto: 'p1', id_subetapa: null, numero_recibo: 'R-0014', monto: 20000.00, metodo_pago: 'TRANSFERENCIA', fecha: '2026-06-01', nota: 'Anticipo obra fase 2', anulado: false, anulado_motivo: null, created_at: hace(1), created_by: null },
];

const GASTOS = [
  { id_gasto: 'g1', tipo: 'ETAPA', id_proyecto: 'p1', id_etapa: 'e2', id_subetapa: 's4', descripcion: 'Alquiler retroexcavadora', categoria: 'HERRAMIENTAS', monto: 3500.00, fecha: '2026-03-25', comprobante: null, id_item: null, cantidad: null, created_at: hace(24), created_by: null },
  { id_gasto: 'g2', tipo: 'ETAPA', id_proyecto: 'p1', id_etapa: 'e2', id_subetapa: 's4', descripcion: 'Materiales excavación', categoria: 'MATERIALES', monto: 5200.00, fecha: '2026-03-28', comprobante: null, id_item: null, cantidad: null, created_at: hace(23), created_by: null },
  { id_gasto: 'g3', tipo: 'GENERAL', id_proyecto: null, id_etapa: null, id_subetapa: null, descripcion: 'Internet oficina', categoria: 'SERVICIOS', monto: 85.00, fecha: '2026-06-01', comprobante: null, id_item: null, cantidad: null, created_at: hace(2), created_by: null },
  { id_gasto: 'g4', tipo: 'GENERAL', id_proyecto: null, id_etapa: null, id_subetapa: null, descripcion: 'Suministros oficina', categoria: 'OTROS', monto: 150.00, fecha: '2026-05-30', comprobante: null, id_item: null, cantidad: null, created_at: hace(5), created_by: null },
  { id_gasto: 'g5', tipo: 'ETAPA', id_proyecto: 'p3', id_etapa: 'e4', id_subetapa: 's11', descripcion: 'Demolición controlada', categoria: 'MATERIALES', monto: 2800.00, fecha: '2026-04-01', comprobante: null, id_item: null, cantidad: null, created_at: hace(7), created_by: null },
  { id_gasto: 'g6', tipo: 'ETAPA', id_proyecto: 'p3', id_etapa: 'e4', id_subetapa: 's12', descripcion: 'Compra de cerámica', categoria: 'MATERIALES', monto: 4500.00, fecha: '2026-04-15', comprobante: null, id_item: null, cantidad: null, created_at: hace(6), created_by: null },
  { id_gasto: 'g7', tipo: 'ETAPA', id_proyecto: 'p4', id_etapa: 'e6', id_subetapa: 's18', descripcion: 'Renta camiones volteo', categoria: 'HERRAMIENTAS', monto: 8500.00, fecha: '2026-02-20', comprobante: null, id_item: null, cantidad: null, created_at: hace(9), created_by: null },
  { id_gasto: 'g8', tipo: 'GENERAL', id_proyecto: null, id_etapa: null, id_subetapa: null, descripcion: 'Combustible', categoria: 'TRANSPORTE', monto: 120.00, fecha: '2026-06-01', comprobante: null, id_item: null, cantidad: null, created_at: hace(1), created_by: null },
  { id_gasto: 'g9', tipo: 'GENERAL', id_proyecto: null, id_etapa: null, id_subetapa: null, descripcion: 'Agua y café', categoria: 'ALIMENTACION', monto: 45.00, fecha: '2026-06-01', comprobante: null, id_item: null, cantidad: null, created_at: hace(1), created_by: null },
];

const INVENTARIO = [
  { id_item: 'i1', codigo: 'CEM-001', nombre: 'Cemento Portland Tipo I', unidad: 'bolsa', stock: 150, stock_min: 50, costo_unit: 8.50, precio_unit: 12.00, categoria: 'MATERIAL', activo: true, created_at: hace(60), created_by: null },
  { id_item: 'i2', codigo: 'VAR-001', nombre: 'Varilla 1/2"', unidad: 'qq', stock: 25, stock_min: 10, costo_unit: 45.00, precio_unit: 65.00, categoria: 'MATERIAL', activo: true, created_at: hace(60), created_by: null },
  { id_item: 'i3', codigo: 'PINT-001', nombre: 'Pintura blanca 5gal', unidad: 'galón', stock: 8, stock_min: 5, costo_unit: 35.00, precio_unit: 55.00, categoria: 'MATERIAL', activo: true, created_at: hace(45), created_by: null },
  { id_item: 'i4', codigo: 'BLO-001', nombre: 'Bloque 20x20x40', unidad: 'und', stock: 500, stock_min: 200, costo_unit: 0.65, precio_unit: 1.10, categoria: 'MATERIAL', activo: true, created_at: hace(45), created_by: null },
  { id_item: 'i5', codigo: 'ARE-001', nombre: 'Arena fina', unidad: 'm3', stock: 3, stock_min: 5, costo_unit: 25.00, precio_unit: 40.00, categoria: 'MATERIAL', activo: true, created_at: hace(30), created_by: null },
  { id_item: 'i6', codigo: 'HERR-001', nombre: 'Taladro percutor', unidad: 'und', stock: 2, stock_min: 1, costo_unit: 180.00, precio_unit: 280.00, categoria: 'HERRAMIENTA', activo: true, created_at: hace(30), created_by: null },
  { id_item: 'i7', codigo: 'HERR-002', nombre: 'Nivel láser', unidad: 'und', stock: 1, stock_min: 1, costo_unit: 220.00, precio_unit: 350.00, categoria: 'HERRAMIENTA', activo: true, created_at: hace(20), created_by: null },
  { id_item: 'i8', codigo: 'INS-001', nombre: 'Cables eléctricos #12', unidad: 'rollo', stock: 4, stock_min: 3, costo_unit: 55.00, precio_unit: 85.00, categoria: 'INSUMO', activo: true, created_at: hace(20), created_by: null },
  { id_item: 'i9', codigo: 'INS-002', nombre: 'Tubería PVC 1/2"', unidad: 'und', stock: 12, stock_min: 10, costo_unit: 3.50, precio_unit: 5.50, categoria: 'INSUMO', activo: true, created_at: hace(15), created_by: null },
  { id_item: 'i10', codigo: 'EQ-001', nombre: 'Andamio metálico', unidad: 'und', stock: 0, stock_min: 2, costo_unit: 450.00, precio_unit: 700.00, categoria: 'EQUIPO', activo: true, created_at: hace(10), created_by: null },
];

const MOVIMIENTOS = [
  { id_mov: 'm1', id_item: 'i1', tipo: 'ENTRADA', cantidad: 200, id_proyecto: null, id_subetapa: null, motivo: 'Compra inicial', costo_unit: 8.50, fecha: '2026-01-01', created_at: hace(60), created_by: null },
  { id_mov: 'm2', id_item: 'i1', tipo: 'SALIDA', cantidad: 50, id_proyecto: 'p1', id_subetapa: 's4', motivo: 'Excavación Residencia Golf', costo_unit: null, fecha: '2026-03-28', created_at: hace(24), created_by: null },
  { id_mov: 'm3', id_item: 'i2', tipo: 'ENTRADA', cantidad: 30, id_proyecto: null, id_subetapa: null, motivo: 'Compra inicial', costo_unit: 45.00, fecha: '2026-01-01', created_at: hace(60), created_by: null },
  { id_mov: 'm4', id_item: 'i5', tipo: 'ENTRADA', cantidad: 10, id_proyecto: null, id_subetapa: null, motivo: 'Compra', costo_unit: 25.00, fecha: '2026-02-01', created_at: hace(45), created_by: null },
  { id_mov: 'm5', id_item: 'i5', tipo: 'SALIDA', cantidad: 7, id_proyecto: 'p4', id_subetapa: 's18', motivo: 'Movimiento tierra CC Brisas', costo_unit: null, fecha: '2026-02-25', created_at: hace(8), created_by: null },
];

const NOTIFICACIONES = [
  { id_notificacion: 'n1', destinatario_id: 'demo-user', titulo: 'Pago registrado', mensaje: 'Se registró un pago de B/. 20,000.00 en Residencia Familiar Altos del Golf', canal: 'INTERNA', tipo: 'EXITO', id_referencia: 'p1', tabla_referencia: 'proyectos', estado: 'PENDIENTE', leida_at: null, created_at: hace(1) },
  { id_notificacion: 'n2', destinatario_id: 'demo-user', titulo: 'Stock bajo', mensaje: 'Arena fina está por debajo del stock mínimo (3 de 5)', canal: 'INTERNA', tipo: 'ADVERTENCIA', id_referencia: 'i5', tabla_referencia: 'inventario_items', estado: 'PENDIENTE', leida_at: null, created_at: hace(2) },
  { id_notificacion: 'n3', destinatario_id: 'demo-user', titulo: 'Proyecto creado', mensaje: 'Se creó el proyecto Oficina Boutique', canal: 'INTERNA', tipo: 'INFO', id_referencia: 'p7', tabla_referencia: 'proyectos', estado: 'LEIDA', leida_at: now, created_at: hace(3) },
];

const AUDITORIA = [
  { id_auditoria: 'a1', tabla: 'proyectos', operacion: 'INSERT', id_registro: 'p1', valores_viejos: null, valores_nuevos: { nombre: 'Residencia Familiar Altos del Golf' }, usuario_id: null, usuario_nombre: 'Admin Demo', direccion_ip: null, created_at: hace(45) },
  { id_auditoria: 'a2', tabla: 'proyecto_pagos', operacion: 'INSERT', id_registro: 'pay1', valores_viejos: null, valores_nuevos: { monto: 16650 }, usuario_id: null, usuario_nombre: 'Admin Demo', direccion_ip: null, created_at: hace(40) },
];

export const MOCK = {
  proyectos: PROYECTOS,
  proyecto_etapas: ETAPAS,
  proyecto_subetapas: SUBETAPAS,
  proyecto_pagos: PAGOS,
  proyecto_gastos: GASTOS,
  clientes: CLIENTES,
  inventario_items: INVENTARIO,
  inventario_movimientos: MOVIMIENTOS,
  notificaciones: NOTIFICACIONES,
  auditoria: AUDITORIA,
  configuracion_empresa: [{ id: 1, nombre_empresa: 'Estudio Demo Arquitectura', ruc: '123456-1-789', telefono: '6000-0000', correo: 'demo@arquitecto.com', direccion: 'Calle 52, San Francisco, Panamá', logo_url: '', pie_pagina_pdf: 'ARQUITECTURA & DISEÑO', moneda_simbolo: 'B/.', moneda_codigo: 'PAB', precios_incluyen_itbms: false, itbms_default_pct: 7, terminos_cotizacion: 'Cotización válida por 15 días. Forma de pago: 50% anticipo, 50% contra entrega.' }],
  usuarios: [{ id: 'demo-user', email: 'demo@arquitecto.com', nombre: 'Admin Demo', rol: 'ROOT', activo: true, telefono: '6000-0000', permisos_extra: null, ultimo_acceso: null, created_at: hace(90) }],
  v_proyectos_completa: PROYECTOS.map(p => {
    const c = CLIENTES.find(x => x.id_cliente === p.id_cliente);
    return { ...p, cliente_nombre: c?.nombre || '', cliente_documento: c?.documento || '', cliente_correo: c?.correo || '', cliente_telefono: c?.telefono || '', total_etapas: ETAPAS.filter(e => e.id_proyecto === p.id_proyecto).length, total_subetapas: SUBETAPAS.filter(s => ETAPAS.find(e => e.id_etapa === s.id_etapa)?.id_proyecto === p.id_proyecto).length, total_pagos: PAGOS.filter(pg => pg.id_proyecto === p.id_proyecto && !pg.anulado).length, creado_por_nombre: 'Admin Demo', brecha: (p.avance_pct || 0) - (p.pago_pct || 0), saldo_pendiente: (p.monto_total || 0) - (p.pagado_total || 0) };
  }),
  v_estadisticas_proyectos: (() => {
    const total = PROYECTOS.length;
    const en_curso = PROYECTOS.filter(p => p.estado === 'EN_CURSO').length;
    const completados = PROYECTOS.filter(p => p.estado === 'FINALIZADO').length;
    const total_presupuestado = PROYECTOS.reduce((s, p) => s + p.monto_total, 0);
    const total_cobrado = PROYECTOS.reduce((s, p) => s + p.pagado_total, 0);
    return [{ total_proyectos: total, en_curso, completados, en_cotizacion: PROYECTOS.filter(p => p.estado === 'COTIZACION').length, pausados: PROYECTOS.filter(p => p.estado === 'PAUSADO').length, cancelados: PROYECTOS.filter(p => p.estado === 'CANCELADO').length, total_presupuestado, total_cobrado, total_por_cobrar: total_presupuestado - total_cobrado }];
  })(),
  v_resumen_mensual: [],
};
