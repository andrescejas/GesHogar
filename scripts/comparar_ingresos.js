import { db } from '../src/lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function run() {
  const movSnap = await getDocs(collection(db, 'movimientos'));
  const proySnap = await getDocs(collection(db, 'proyecciones'));
  const catSnap = await getDocs(collection(db, 'categorias'));
  const subSnap = await getDocs(collection(db, 'subcategorias'));

  const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const subs = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const movs = movSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const proys = proySnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const meses = ['2026-09', '2026-10'];

  for (const mes of meses) {
    console.log('\n=========================================');
    console.log(`MES EVALUADO: ${mes}`);
    console.log('=========================================');

    // Proyecciones
    const proysMes = proys.filter(p => {
      const freq = p.frecuencia || 'Única';
      if (freq === 'Única') return p.mes === mes;
      const startMonth = p.fechaInicio ? p.fechaInicio.substring(0, 7) : p.mes;
      const endMonth = p.fechaFin ? p.fechaFin.substring(0, 7) : null;
      if (mes < startMonth) return false;
      if (endMonth && mes > endMonth) return false;
      const dStart = new Date(startMonth + '-01');
      const dCurrent = new Date(mes + '-01');
      const diffMonths = (dCurrent.getFullYear() - dStart.getFullYear()) * 12 + (dCurrent.getMonth() - dStart.getMonth());
      switch(freq) {
        case 'Mensual': return true;
        case 'Bimestral': return diffMonths % 2 === 0;
        case 'Trimestral': return diffMonths % 3 === 0;
        case 'Semestral': return diffMonths % 6 === 0;
        case 'Anual': return diffMonths % 12 === 0;
        default: return false;
      }
    });

    const proysIngreso = proysMes.filter(p => {
      const cat = cats.find(c => c.id === p.categoriaId);
      return p.tipo === 'ingreso' || cat?.tipo === 'ingreso';
    });

    console.log('\n--- PROYECCIONES DE INGRESO ---');
    let totalProy = 0;
    for (const p of proysIngreso) {
      const cat = cats.find(c => c.id === p.categoriaId);
      const sub = subs.find(s => s.id === p.subcategoriaId);
      const m = Number(p.montoProyectado !== undefined && p.montoProyectado !== null ? p.montoProyectado : (p.monto || 0));
      totalProy += m;
      console.log(`  • [${p.frecuencia || 'Única'}] ${sub?.nombre || cat?.nombre || 'Sin nombre'} (${p.responsable || 'Sin asignar'}) -> $${m.toLocaleString('es-AR')} | desc: "${p.descripcion || '-'}" | cat: "${cat?.nombre || '-'}"`);
    }
    console.log(`>>> TOTAL PROYECTADO: $${totalProy.toLocaleString('es-AR')}`);

    // Movimientos
    const movsMes = movs.filter(m => (m.fecha || '').startsWith(mes));
    const movsIngreso = movsMes.filter(m => m.tipo === 'ingreso');

    console.log('\n--- MOVIMIENTOS REALES DE INGRESO ---');
    let totalMovsContabilizan = 0;
    let totalMovsNoContabilizan = 0;

    for (const m of movsIngreso) {
      const cat = cats.find(c => c.id === m.categoriaId);
      const sub = subs.find(s => s.id === m.subcategoriaId);
      const monto = Number(m.monto || 0);
      const contab = m.contabiliza !== false && m.estado !== 'proyectado';
      if (contab) {
        totalMovsContabilizan += monto;
      } else {
        totalMovsNoContabilizan += monto;
      }
      console.log(`  • ${m.fecha} | $${monto.toLocaleString('es-AR')} | ${sub?.nombre || cat?.nombre || 'Sin cat'} | desc: "${m.descripcion}" | resp: ${m.responsable} | contabiliza: ${m.contabiliza} | estado: ${m.estado}`);
    }
    console.log(`>>> TOTAL MOVIMIENTOS QUE CONTABILIZAN: $${totalMovsContabilizan.toLocaleString('es-AR')}`);
    if (totalMovsNoContabilizan > 0) {
      console.log(`>>> TOTAL MOVIMIENTOS IGNORADOS (contabiliza=false / proyectado): $${totalMovsNoContabilizan.toLocaleString('es-AR')}`);
    }
    console.log(`\n>>> DIFERENCIA (Movimientos - Proyección): $${(totalMovsContabilizan - totalProy).toLocaleString('es-AR')}`);
  }

  process.exit(0);
}

run().catch(console.error);
