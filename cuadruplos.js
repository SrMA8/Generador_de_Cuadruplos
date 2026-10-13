const inputEcuacion = document.getElementById('ecuacion');
const seccionVars = document.getElementById('seccionVariables');
const contenedorVars = document.getElementById('contenedorVariables');
const contenedorResultado = document.getElementById('resultadoContainer');
const alertaContainer = document.getElementById('alertaContainer');

const btnTriplos = document.getElementById('btnTriplos');
const btnCuadruplos = document.getElementById('btnCuadruplos');
const btnAmbas = document.getElementById('btnAmbas');
const btnLimpiar = document.getElementById('btnLimpiar');

const valoresPorDefecto = {
    a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0, 
    x: 0, y: 0, m: 0, n: 0, p: 0, q: 0, r: 0, k: 0, o: 0
};

function mostrarAlerta(mensaje, tipo = 'warning') {
    if (!alertaContainer) return;
    alertaContainer.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show shadow-sm" role="alert">
            <i class="bi bi-exclamation-triangle-fill me-2"></i> ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}

function obtenerVariables(expresion) {
    const tokens = expresion.match(/[a-zA-Z]+/g) || [];
    const unicas = [...new Set(tokens)];
    return unicas;
}

function actualizarInputsVariables() {
    const expr = inputEcuacion.value;
    const vars = obtenerVariables(expr);
    
    let varsEntrada = vars;
    if (expr.includes('=')) {
        const partes = expr.split('=');
        const varDestino = partes[0].trim();
        varsEntrada = vars.filter(v => v !== varDestino);
    }

    contenedorVars.innerHTML = '';

    if (varsEntrada.length === 0) {
        seccionVars.style.display = 'none';
        return;
    }

    seccionVars.style.display = 'block';

    varsEntrada.forEach(variable => {
        const valDefecto = valoresPorDefecto[variable] !== undefined ? valoresPorDefecto[variable] : 1;
        const col = document.createElement('div');
        col.className = 'col-6 col-sm-4 col-md-3';
        col.innerHTML = `
            <div class="input-group input-group-sm">
                <span class="input-group-text fw-bold bg-light">${variable}</span>
                <input type="number" class="form-control var-input" data-var="${variable}" value="${valDefecto}">
            </div>
        `;
        contenedorVars.appendChild(col);
    });
}

inputEcuacion.addEventListener('input', actualizarInputsVariables);
actualizarInputsVariables();

function obtenerEntornoValores() {
    const envValues = {};
    document.querySelectorAll('.var-input').forEach(input => {
        const vName = input.getAttribute('data-var');
        envValues[vName] = parseFloat(input.value) || 0;
    });
    return envValues;
}

function generarCuadruplosJerarquia(expr, varDestino, valores) {
    const cuadruplos = [];
    let tCount = 1;
    let tokens = expr.match(/([a-zA-Z0-9\.]+|[\+\-\*\/\(\)])/g) || [];

    function formatOp(token, valMap) {
        if (token === '—' || token === null || token === undefined) return '—';
        if (!isNaN(token)) return `${token}`;
        const val = valMap[token] !== undefined ? valMap[token] : (valores[token] !== undefined ? valores[token] : 0);
        return `${token} (${val})`;
    }

    const valTracker = { ...valores };

    function procesarExpresion(toks) {
        const ops = [];
        const vals = [];
        const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };

        function applyOp() {
            const op = ops.pop();
            const right = vals.pop();
            const left = vals.pop();
            
            const vLeft = valTracker[left] !== undefined ? valTracker[left] : (isNaN(left) ? 0 : parseFloat(left));
            const vRight = valTracker[right] !== undefined ? valTracker[right] : (isNaN(right) ? 0 : parseFloat(right));
            
            let resNum = 0;
            if (op === '+') resNum = vLeft + vRight;
            if (op === '-') resNum = vLeft - vRight;
            if (op === '*') resNum = vLeft * vRight;
            if (op === '/') resNum = vRight !== 0 ? vLeft / vRight : 0;

            resNum = Math.round(resNum * 100) / 100;
            const tName = `t${tCount++}`;
            valTracker[tName] = resNum;

            cuadruplos.push({
                op: op,
                op1: formatOp(left, valTracker),
                op2: formatOp(right, valTracker),
                res: `${tName} (${resNum})`,
                tName: tName
            });

            vals.push(tName);
        }

        for (let i = 0; i < toks.length; i++) {
            let t = toks[i];
            if (t === '(') {
                ops.push(t);
            } else if (t === ')') {
                while (ops.length && ops[ops.length - 1] !== '(') {
                    applyOp();
                }
                ops.pop();
            } else if (['+', '-', '*', '/'].includes(t)) {
                while (ops.length && precedence[ops[ops.length - 1]] >= precedence[t]) {
                    applyOp();
                }
                ops.push(t);
            } else {
                vals.push(t);
            }
        }

        while (ops.length) {
            applyOp();
        }

        return vals[0];
    }

    const ultimoTemporal = procesarExpresion(tokens);
    const valFinal = valTracker[ultimoTemporal] !== undefined ? valTracker[ultimoTemporal] : 0;

    cuadruplos.push({
        op: '=',
        op1: `${ultimoTemporal} (${valFinal})`,
        op2: '—',
        res: `${varDestino} (${valFinal})`
    });

    return cuadruplos;
}

function generarTriplosJerarquia(expr, varDestino, valores) {
    const cuads = generarCuadruplosJerarquia(expr, varDestino, valores);
    const triplos = [];
    const mapaTriplos = {};

    cuads.forEach((c, idx) => {
        let op1 = c.op1;
        let op2 = c.op2;

        Object.keys(mapaTriplos).forEach(tKey => {
            if (op1.includes(tKey)) {
                op1 = op1.replace(new RegExp(tKey, 'g'), `(${mapaTriplos[tKey]})`);
            }
            if (op2.includes(tKey)) {
                op2 = op2.replace(new RegExp(tKey, 'g'), `(${mapaTriplos[tKey]})`);
            }
        });

        if (c.op === '=') {
            const ultimoIndice = triplos.length - 1;
            triplos.push({
                op: '=',
                op1: `(${ultimoIndice})`,
                op2: '—',
                res: c.res.split(' ')[0]
            });
        } else {
            const actualIndex = triplos.length;
            const temporalActual = `t${idx + 1}`;
            mapaTriplos[temporalActual] = actualIndex;

            triplos.push({
                op: c.op,
                op1: op1,
                op2: op2,
                res: c.res
            });
        }
    });

    return triplos;
}

function renderTablaCuadruplos(cuadruplos) {
    let html = `
        <h4 class="text-success fw-bold mt-4">Tabla de Cuádruplos</h4>
        <table class="table table-bordered table-striped table-hover shadow-sm bg-white">
            <thead class="table-dark">
                <tr>
                    <th>#</th>
                    <th>Operador</th>
                    <th>Operando 1</th>
                    <th>Operando 2</th>
                    <th>Resultado</th>
                </tr>
            </thead>
            <tbody>
    `;
    cuadruplos.forEach((c, index) => {
        html += `
            <tr>
                <td class="fw-bold">${index + 1}</td>
                <td class="text-primary fw-bold">${c.op}</td>
                <td>${c.op1}</td>
                <td>${c.op2}</td>
                <td class="fw-bold text-success">${c.res}</td>
            </tr>
        `;
    });
    html += `</tbody></table>`;
    return html;
}

function renderTablaTriplos(triplos) {
    let html = `
        <h4 class="text-primary fw-bold mt-4">Tabla de Triplos</h4>
        <table class="table table-bordered table-striped table-hover shadow-sm bg-white">
            <thead class="table-primary text-dark">
                <tr>
                    <th>#</th>
                    <th>Operador</th>
                    <th>Operando 1</th>
                    <th>Operando 2</th>
                </tr>
            </thead>
            <tbody>
    `;
    triplos.forEach((t, index) => {
        html += `
            <tr>
                <td class="fw-bold">(${index})</td>
                <td class="text-danger fw-bold">${t.op}</td>
                <td>${t.op1}</td>
                <td>${t.op2}</td>
            </tr>
        `;
    });
    html += `</tbody></table>`;
    return html;
}

function procesarAccion(tipo) {
    const exprRaw = inputEcuacion.value.trim();
    contenedorResultado.innerHTML = '';
    if (alertaContainer) alertaContainer.innerHTML = '';

    if (!exprRaw) {
        mostrarAlerta('Por favor, introduce una ecuación válida antes de continuar.', 'danger');
        return;
    }

    const inputsVars = document.querySelectorAll('.var-input');
    let hayCamposVacios = false;
    
    inputsVars.forEach(input => {
        if (input.value.trim() === '') {
            hayCamposVacios = true;
        }
    });

    if (hayCamposVacios) {
        mostrarAlerta('Por favor, asigna un valor a todas las variables antes de generar el código.', 'danger');
        return;
    }

    const valores = obtenerEntornoValores();
    let varDestino = 'z';
    let expresionRHS = exprRaw;

    if (exprRaw.includes('=')) {
        const partes = exprRaw.split('=');
        varDestino = partes[0].trim();
        expresionRHS = partes[1].trim();
    }

    let contenidoHTML = '';

    if (tipo === 'triplos' || tipo === 'ambas') {
        const triplos = generarTriplosJerarquia(expresionRHS, varDestino, valores);
        contenidoHTML += renderTablaTriplos(triplos);
    }

    if (tipo === 'cuadruplos' || tipo === 'ambas') {
        const cuadruplos = generarCuadruplosJerarquia(expresionRHS, varDestino, valores);
        contenidoHTML += renderTablaCuadruplos(cuadruplos);
    }

    contenedorResultado.innerHTML = contenidoHTML;
}

function limpiarTodo() {
    inputEcuacion.value = '';
    contenedorResultado.innerHTML = '';
    if (alertaContainer) alertaContainer.innerHTML = '';
    actualizarInputsVariables();
}

btnTriplos.addEventListener('click', () => procesarAccion('triplos'));
btnCuadruplos.addEventListener('click', () => procesarAccion('cuadruplos'));
btnAmbas.addEventListener('click', () => procesarAccion('ambas'));
btnLimpiar.addEventListener('click', limpiarTodo);