function gerarRelatorioPDF() {
    const jsPDF = window.jsPDF || window.jspdf.jsPDF;

    if (typeof jsPDF === 'undefined') {
        console.error('Biblioteca jsPDF não carregada');
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Biblioteca jsPDF necessária não foi carregada.'
        });
        return;
    }
    const doc = new jsPDF('p', 'mm', 'a4');
    Swal.fire({
        title: 'Gerando Relatório...',
        text: 'Preparando documento técnico...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    coletarDadosCompletos(doc);
}

async function coletarDadosCompletos(doc) {
    try {
        const workflowData = {
            titulo: document.getElementById('workflowTitulo')?.textContent || 'Não informado',
            descricao: document.getElementById('workflowDescricao')?.textContent || 'Não informado',
            prioridade: document.getElementById('workflowPrioridade')?.textContent?.replace(/\s+/g, ' ').trim() || 'Não informado',
            categoria: document.getElementById('workflowCategoria')?.textContent?.replace(/\s+/g, ' ').trim() || 'Não informado',
            status: document.getElementById('workflowStatus')?.textContent?.replace(/\s+/g, ' ').trim() || 'Não informado',
            criador: document.getElementById('workflowCriador')?.textContent || 'Não informado',
            dataCriacao: document.getElementById('workflowDataCriacao')?.textContent || 'Não informado',
            prazoFinal: document.getElementById('prazoFinal')?.textContent || 'Não informado',
            id: WORKFLOW_ID || 'N/A'
        };
        const responsaveis = [];
        document.querySelectorAll('#responsaveisContainer .card').forEach(card => {
            const nome = card.querySelector('.card-title')?.textContent?.trim();
            const login = card.querySelector('.card-text')?.textContent?.trim();
            if (nome && nome !== 'Carregando...') {
                responsaveis.push({ nome, login: login || 'Não informado' });
            }
        });
        const anexos = [];
        document.querySelectorAll('#anexosContainer .card').forEach(card => {
            const nome = card.querySelector('.card-title')?.textContent?.trim();
            const tamanho = card.querySelector('.small div:first-child')?.textContent?.replace('•', '').trim();
            const data = card.querySelector('.small div:last-child')?.textContent?.replace('•', '').trim();
            if (nome && nome !== 'Carregando...') {
                anexos.push({ nome, tamanho: tamanho || 'Não informado', data: data || 'Não informado' });
            }
        });
        const historicoCompleto = await coletarHistoricoComChats();
        await gerarPDFComEspacamentoAjustado(doc, workflowData, responsaveis, anexos, historicoCompleto);
        Swal.close();
        const fileName = `Relatorio_Workflow_${workflowData.titulo.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: 'Erro ao gerar PDF',
            text: 'Ocorreu um erro durante a geração do relatório: ' + error.message
        });
    }
}

async function coletarHistoricoComChats() {
    const historico = [];
    const etapas = document.querySelectorAll('#timeline-items .d-flex.mb-4');
    for (const item of etapas) {
        const titulo = item.querySelector('h6')?.textContent?.trim();
        const data = item.querySelector('small.text-muted')?.textContent?.trim();
        const descricao = item.querySelector('p.mb-1')?.textContent?.trim();
        const usuario = item.querySelector('small.text-muted .fa-user')?.parentNode?.textContent?.trim();
        const botaoJustificativa = item.querySelector('.btn-ver-justificativa');
        const justificativa = botaoJustificativa ? botaoJustificativa.getAttribute('data-justificativa') : null;
        const botaoChat = item.querySelector('.btn-chat-reprovacao');
        let chatMessages = [];
        if (botaoChat) {
            const etapaId = botaoChat.getAttribute('data-etapa-id');
            if (etapaId) {
                chatMessages = await carregarMensagensChat(etapaId);
            }
        }
        if (titulo && data && titulo !== 'Carregando...') {
            historico.push({
                titulo,
                data,
                descricao: descricao || '',
                usuario: usuario || 'Não identificado',
                justificativa: justificativa || '',
                chatMessages,
                tipo: botaoChat ? 'REPROVACAO' : 'OUTRO'
            });
        }
    }
    return historico;
}

async function carregarMensagensChat(etapaId) {
    try {
        const endpoint = `/app/routers/workflow/WorkFlowRouter.php?action=getChatReprovacao&etapaId=${etapaId}`;
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'include'
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        return result.status === 'success' ? result.data || [] : [];
    } catch (error) {
        console.error('Erro ao carregar mensagens do chat:', error);
        return [];
    }
}

async function gerarPDFComEspacamentoAjustado(doc, workflowData, responsaveis, anexos, historico) {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (2 * margin);
    const footerHeight = 25;
    let y = margin;
    const styles = {
        title: { size: 16, style: 'bold' },
        subtitle: { size: 14, style: 'bold' },
        section: { size: 12, style: 'bold' },
        normal: { size: 10, style: 'normal' },
        small: { size: 9, style: 'normal' },
        tiny: { size: 8, style: 'normal' }
    };

    function addTextWithSpacing(text, x, y, maxWidth, fontSize = styles.normal.size, style = 'normal', lineHeight = 6) {
        if (!text) return { height: 0, lines: [] };
        doc.setFontSize(fontSize);
        doc.setFont(undefined, style);
        const lines = doc.splitTextToSize(text.toString(), maxWidth);
        doc.text(lines, x, y);
        return { height: lines.length * lineHeight, lines };
    }

    function checkSpace(neededHeight) {
        return y + neededHeight < doc.internal.pageSize.getHeight() - footerHeight;
    }

    function newPage() {
        doc.addPage();
        y = margin;
        doc.setTextColor(0, 0, 0);
    }

    function addSection(title) {
        if (!checkSpace(30)) newPage();
        doc.setFillColor(41, 128, 185);
        doc.rect(margin, y, contentWidth, 8, 'F');
        doc.setFontSize(styles.section.size);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(title, margin + 5, y + 5.5);

        y += 12;
        doc.setTextColor(0, 0, 0);
    }

    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setFontSize(styles.title.size);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('RELATÓRIO TÉCNICO - WORKFLOW', margin, 15);
    doc.setFontSize(styles.small.size);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, 22);
    y = 35;

    addSection('INFORMAÇÕES GERAIS DO WORKFLOW');

    const infoData = [
        ['Título:', workflowData.titulo],
        ['Descrição:', workflowData.descricao],
        ['Status:', workflowData.status],
        ['Prioridade:', workflowData.prioridade],
        ['Categoria:', workflowData.categoria],
        ['Criado por:', workflowData.criador],
        ['Data de Criação:', workflowData.dataCriacao],
        ['Prazo Final:', workflowData.prazoFinal],
        ['ID do Workflow:', workflowData.id]
    ];

    infoData.forEach(([label, value]) => {
        if (!checkSpace(15)) {
            newPage();
            addSection('INFORMAÇÕES GERAIS DO WORKFLOW (Continuação)');
        }

        // Label
        doc.setFontSize(styles.normal.size);
        doc.setFont(undefined, 'bold');
        doc.text(label, margin, y);

        // Value com cálculo de altura correto
        doc.setFont(undefined, 'normal');
        const valueResult = addTextWithSpacing(value, margin + 45, y, contentWidth - 50, styles.normal.size, 'normal', 5);

        // Avançar Y baseado na maior altura
        const lineHeight = Math.max(6, valueResult.height);
        y += lineHeight + 4;
    });

    y += 12; // Aumentado de 10 para 12

    // ========== RESPONSÁVEIS ==========
    if (!checkSpace(40)) newPage();
    addSection('RESPONSÁVEIS');

    if (responsaveis.length > 0) {
        responsaveis.forEach((resp, index) => {
            if (!checkSpace(20)) {
                newPage();
                addSection('RESPONSÁVEIS (Continuação)');
            }

            doc.setFontSize(styles.normal.size);
            doc.setFont(undefined, 'bold');
            doc.text(`${index + 1}. ${resp.nome}`, margin, y);

            doc.setFontSize(styles.small.size);
            doc.setFont(undefined, 'normal');
            doc.text(`Login: ${resp.login}`, margin + 10, y + 6);

            y += 18; // Aumentado de 16 para 18
        });
    } else {
        doc.setFontSize(styles.normal.size);
        doc.text('Nenhum responsável atribuído', margin, y);
        y += 14; // Aumentado de 12 para 14
    }

    y += 12; // Aumentado de 10 para 12

    // ========== ANEXOS ==========
    if (!checkSpace(40)) newPage();
    addSection('DOCUMENTOS ANEXOS');

    if (anexos.length > 0) {
        anexos.forEach((anexo, index) => {
            if (!checkSpace(25)) {
                newPage();
                addSection('DOCUMENTOS ANEXOS (Continuação)');
            }

            doc.setFontSize(styles.normal.size);
            doc.setFont(undefined, 'bold');
            doc.text(`${index + 1}. ${anexo.nome}`, margin, y);

            doc.setFontSize(styles.small.size);
            doc.setFont(undefined, 'normal');
            doc.text(`Tamanho: ${anexo.tamanho}`, margin + 10, y + 6);
            doc.text(`Data: ${anexo.data}`, margin + 10, y + 12);

            y += 24; // Aumentado de 22 para 24
        });
    } else {
        doc.setFontSize(styles.normal.size);
        doc.text('Nenhum documento anexado', margin, y);
        y += 14; // Aumentado de 12 para 14
    }

    y += 12; // Aumentado de 10 para 12

    // ========== HISTÓRICO DE ATIVIDADES ==========
    if (!checkSpace(50)) newPage();
    addSection('HISTÓRICO DE ATIVIDADES');

    if (historico.length > 0) {
        historico.forEach((item, index) => {
            // Verificar espaço ANTES de começar a atividade
            const estimatedHeight = calcularAlturaAtividade(item, doc, contentWidth);
            if (!checkSpace(estimatedHeight)) {
                newPage();
                addSection('HISTÓRICO DE ATIVIDADES (Continuação)');
            }

            const startY = y;

            // Cabeçalho da atividade - MAIS ESPAÇO
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, y, contentWidth, 14, 'F'); // Aumentado de 12 para 14
            doc.setDrawColor(200, 200, 200);
            doc.rect(margin, y, contentWidth, 14);

            doc.setFontSize(styles.normal.size);
            doc.setFont(undefined, 'bold');
            doc.text(`ATIVIDADE ${index + 1}: ${item.titulo}`, margin + 5, y + 9); // Ajustado para centro
            y += 18; // Aumentado de 15 para 18 - MAIS ESPAÇO APÓS TÍTULO

            // Informações básicas - MAIS ESPAÇO
            doc.setFontSize(styles.small.size);
            doc.setFont(undefined, 'normal');
            doc.text(`Data/Hora: ${item.data}`, margin, y);
            doc.text(`Responsável: ${item.usuario}`, margin + contentWidth / 2, y);
            y += 12; // Aumentado de 10 para 12 - MAIS ESPAÇO APÓS INFORMAÇÕES BÁSICAS

            // Descrição - MAIS ESPAÇO ENTRE TÍTULO E TEXTO
            if (item.descricao) {
                doc.setFont(undefined, 'bold');
                doc.text('Descrição:', margin, y);
                y += 8; // Aumentado de 6 para 8 - MAIS ESPAÇO APÓS TÍTULO

                doc.setFont(undefined, 'normal');
                const descResult = addTextWithSpacing(item.descricao, margin + 5, y, contentWidth - 10, styles.small.size, 'normal', 6); // Aumentado line height
                y += descResult.height + 10; // Aumentado de 8 para 10 - MAIS ESPAÇO APÓS DESCRIÇÃO
            }

            // Justificativa - MAIS ESPAÇO ENTRE TÍTULO E TEXTO
            if (item.justificativa) {
                doc.setFontSize(styles.small.size);
                doc.setFont(undefined, 'bold');
                doc.text('Justificativa:', margin, y);
                y += 8; // Aumentado de 6 para 8 - MAIS ESPAÇO APÓS TÍTULO

                const justResult = addTextWithSpacing(item.justificativa, margin + 5, y, contentWidth - 10, styles.tiny.size, 'normal', 5); // Aumentado line height
                y += justResult.height + 12; // Aumentado de 10 para 12 - MAIS ESPAÇO APÓS JUSTIFICATIVA
            }

            // Chat de reprovação - MAIS ESPAÇO ENTRE TÍTULO E CONTEÚDO
            if (item.tipo === 'REPROVACAO' && item.chatMessages.length > 0) {
                doc.setFontSize(styles.small.size);
                doc.setFont(undefined, 'bold');
                doc.text('HISTÓRICO DE COMUNICAÇÃO:', margin, y);
                y += 10; // Aumentado de 8 para 10 - MAIS ESPAÇO APÓS TÍTULO

                item.chatMessages.forEach((msg) => {
                    if (!checkSpace(35)) { // Aumentado de 30 para 35
                        newPage();
                        addSection('HISTÓRICO DE ATIVIDADES (Continuação)');
                        // Repetir o cabeçalho da atividade atual na nova página
                        doc.setFillColor(245, 245, 245);
                        doc.rect(margin, y, contentWidth, 14, 'F');
                        doc.setDrawColor(200, 200, 200);
                        doc.rect(margin, y, contentWidth, 14);
                        doc.setFontSize(styles.normal.size);
                        doc.setFont(undefined, 'bold');
                        doc.text(`ATIVIDADE ${index + 1}: ${item.titulo} (continuação)`, margin + 5, y + 9);
                        y += 18;
                    }

                    const dataHora = formatarDataHoraPDF(msg.data_hora || new Date().toISOString());
                    const msgStartY = y;

                    // Container da mensagem - MAIOR
                    doc.setFillColor(250, 250, 250);
                    doc.rect(margin, y, contentWidth, 28, 'F'); // Aumentado de 25 para 28
                    doc.setDrawColor(200, 200, 200);
                    doc.rect(margin, y, contentWidth, 28);

                    // Cabeçalho da mensagem - MAIS ESPAÇO
                    doc.setFontSize(styles.tiny.size);
                    doc.setFont(undefined, 'bold');
                    doc.text(`${msg.usuario || 'Usuário'} - ${dataHora}`, margin + 5, y + 7); // Ajustado para mais espaço

                    // Conteúdo da mensagem - MAIS ESPAÇO ENTRE LINHAS
                    const messageResult = addTextWithSpacing(msg.justificativa || '', margin + 5, y + 14, contentWidth - 10, styles.tiny.size, 'normal', 4.5); // Aumentado line height

                    // Ajustar altura do container se necessário
                    const neededHeight = Math.max(28, 20 + messageResult.height); // Ajustado cálculo
                    if (neededHeight > 28) {
                        doc.setFillColor(250, 250, 250);
                        doc.rect(margin, msgStartY, contentWidth, neededHeight, 'F');
                        doc.setDrawColor(200, 200, 200);
                        doc.rect(margin, msgStartY, contentWidth, neededHeight);
                    }

                    y += neededHeight + 8; // Aumentado de 6 para 8 - MAIS ESPAÇO ENTRE MENSAGENS
                });

                y += 6; // Aumentado de 4 para 6 - MAIS ESPAÇO APÓS BLOCO DE CHAT
            }

            // Linha divisória entre atividades - MAIS ESPAÇO
            if (index < historico.length - 1) {
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, y, pageWidth - margin, y);
                y += 15; // Aumentado de 12 para 15 - MAIS ESPAÇO APÓS LINHA DIVISÓRIA
            }
        });
    } else {
        doc.setFontSize(styles.normal.size);
        doc.text('Nenhuma atividade registrada no sistema', margin, y);
        y += 16; // Aumentado de 15 para 16
    }

    // ========== RODAPÉ ==========
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const footerY = doc.internal.pageSize.getHeight() - footerHeight + 5;

        doc.setDrawColor(200, 200, 200);
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

        doc.setFontSize(styles.tiny.size);
        doc.setTextColor(100, 100, 100);

        doc.text(`Workflow ID: ${workflowData.id}`, margin, footerY);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });
        doc.text('Sistema de Gestão de Workflows', pageWidth - margin, footerY, { align: 'right' });

        doc.setTextColor(0, 0, 0);
    }
}

function calcularAlturaAtividade(item, doc, contentWidth) {
    let altura = 45; // Altura base aumentada: cabeçalho + informações básicas

    if (item.descricao) {
        const lines = doc.splitTextToSize(item.descricao, contentWidth - 10);
        altura += 18 + (lines.length * 6); // Título + conteúdo (aumentado)
    }

    if (item.justificativa) {
        const lines = doc.splitTextToSize(item.justificativa, contentWidth - 10);
        altura += 20 + (lines.length * 5); // Título + conteúdo (aumentado)
    }

    if (item.tipo === 'REPROVACAO' && item.chatMessages.length > 0) {
        altura += 16; // Título do chat (aumentado)
        item.chatMessages.forEach(msg => {
            const msgLines = doc.splitTextToSize(msg.justificativa || '', contentWidth - 10);
            altura += 36 + (msgLines.length * 4.5);
        });
    }
    altura += 15;
    return altura;
}

function formatarDataHoraPDF(dataHoraString) {
    try {
        const data = new Date(dataHoraString);
        return data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dataHoraString;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const btnGerarPDF = document.getElementById('btnGerarPDF');
    if (btnGerarPDF) {
        btnGerarPDF.addEventListener('click', gerarRelatorioPDF);
    }
});

window.gerarRelatorioPDF = gerarRelatorioPDF;
