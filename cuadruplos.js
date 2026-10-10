const inputEcuacion = document.getElementById('ecuacion');
const seccionVars = document.getElementById('seccionVariables');
const contenedorVars = document.getElementById('contenedorVariables');
const btnProcesar = document.getElementById('btnProcesar');
const contenedorResultado = document.getElementById('resultadoContainer');

// Valores por defecto sugeridos para las letras comunes
const valoresPorDefecto = {
    a: 4, b: 2, c: 8, d: 4, e: 3, f: 3, g: 2, 
    x: 8, y: 2, m: 6, n: 3, p: 4, q: 5, r: 3, k: 5, o: 3
};

// Función para extraer variables únicas de la expresión
function obtenerVariables(expresion) {
    const tokens = expresion.match(/[a-zA-Z]+/g) || [];
    // Filtramos para ignorar temporales tipo t1, t2... si los hubiera
    const unicas = [...new Set(tokens)];
    return unicas;
}

// Renderiza los inputs para ingresar valores dinámicamente
function actualizarInputsVariables() {
    const expr = inputEcuacion.value;
    const vars = obtenerVariables(expr);
    
    // Si hay una asignación tipo "z = ...", ignoramos la variable destino de los inputs de entrada
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

// Detecta cambios en la ecuación para actualizar los campos de variables
inputEcuacion.addEventListener('input', actualizarInputsVariables);

// Inicializar al cargar
actualizarInputsVariables();

// Generar la tabla de cuádruplos al presionar el botón
btnProcesar.addEventListener('click', () => {
    const exprRaw = inputEcuacion.value.trim();
    contenedorResultado.innerHTML = '';

    if (!exprRaw) {
        alert('Por favor, ingresa una ecuación.');
        return;
    }

    // Recolectar valores ingresados por el usuario
    const envValues = {};
    document.querySelectorAll('.var-input').forEach(input => {
        const vName = input.getAttribute('data-var');
        envValues[vName] = parseFloat(input.value) || 0;
    });

    // Analizar si hay variable de destino (ej: "z = a * b")
    let varDestino = 'z';
    let expresionRHS = exprRaw;

    if (exprRaw.includes('=')) {
        const partes = exprRaw.split('=');
        varDestino = partes[0].trim();
        expresionRHS = partes[1].trim();
    }

    // Generar cuádruplos simulados respetando jerarquía
    const cuadruplos = generarCuadruplosJerarquia(expresionRHS, varDestino, envValues);

    // Dibujar Tabla
    let html = `
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

    html += `
            </tbody>
        </table>
    `;

    contenedorResultado.innerHTML = html;
});

// Función creadora de cuádruplos jerárquicos evaluando valores
function generarCuadruplosJerarquia(expr, varDestino, valores) {
    const cuadruplos = [];
    let tCount = 1;

    // Normalizar tokens
    let tokens = expr.match(/([a-zA-Z0-9\.]+|[\+\-\*\/\(\)])/g) || [];

    // Helper para obtener el valor literal o guardado
    function getVal(token) {
        if (!isNaN(token)) return parseFloat(token);
        if (valores[token] !== undefined) return valores[token];
        return token; // si es un t1, t2, etc.
    }

    // Helper para formatear operando mostrando nombre y valor: "a (4)" o "t1 (8)"
    function formatOp(token, valMap) {
        if (token === '—' || token === null || token === undefined) return '—';
        if (!isNaN(token)) return `${token}`;
        const val = valMap[token] !== undefined ? valMap[token] : getVal(token);
        return `${token} (${val})`;
    }

    const valTracker = { ...valores };

    // Evaluador simple paso a paso utilizando Shunting-Yard para respetar paréntesis y jerarquía
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

            // Limpieza de decimales largos
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
                ops.pop(); // Quita '('
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

    // Asignación final
    cuadruplos.push({
        op: '=',
        op1: `${ultimoTemporal} (${valFinal})`,
        op2: '—',
        res: `${varDestino} (${valFinal})`
    });

    return cuadruplos;
}