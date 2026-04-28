function gerarRelatorioPDF() {
    const jsPDF = window.jsPDF || window.jspdf?.jsPDF;

    if (typeof jsPDF === 'undefined') {
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Biblioteca jsPDF necessaria nao foi carregada.'
        });
        return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    Swal.fire({
        title: 'Gerando relatorio...',
        text: 'Preparando documento tecnico...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    coletarDadosCompletos(doc);
}

async function coletarDadosCompletos(doc) {
    try {
        const pageState = window.LuminaWorkflowPage?.getState?.() || {};
        const workflow = pageState.workflow || {};
        const timeline = Array.isArray(pageState.timeline) ? pageState.timeline : [];

        const workflowData = {
            titulo: document.getElementById('workflowTitulo')?.textContent || 'Nao informado',
            descricao: document.getElementById('workflowDescricao')?.textContent || 'Nao informado',
            prioridade: document.getElementById('workflowPrioridade')?.textContent?.replace(/\s+/g, ' ').trim() || 'Nao informado',
            categoria: document.getElementById('workflowCategoria')?.textContent?.replace(/\s+/g, ' ').trim() || 'Nao informado',
            status: document.getElementById('workflowStatus')?.textContent?.replace(/\s+/g, ' ').trim() || 'Nao informado',
            criador: document.getElementById('workflowCriador')?.textContent || 'Nao informado',
            dataCriacao: document.getElementById('workflowDataCriacao')?.textContent || 'Nao informado',
            prazoFinal: document.getElementById('prazoFinal')?.textContent || 'Nao informado',
            id: WORKFLOW_ID || 'N/A'
        };

        const responsaveis = (workflow.responsaveis || []).map((responsavel) => ({
            nome: responsavel.nome_usuario || 'Usuario',
            login: responsavel.usuario_login ? `@${responsavel.usuario_login}` : 'Nao informado'
        }));

        const anexos = (workflow.anexos || []).map((anexo) => ({
            nome: anexo.nome_arquivo || 'Arquivo',
            tamanho: formatarTamanhoArquivo(anexo.tamanho),
            data: formatarDataHoraPDF(anexo.data_upload)
        }));

        const historicoCompleto = await coletarHistoricoComChats(timeline);
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
            text: `Ocorreu um erro durante a geracao do relatorio: ${error.message}`
        });
    }
}

async function coletarHistoricoComChats(etapas) {
    const historico = [];

    for (const etapa of etapas) {
        let chatMessages = [];

        if (etapa.tipo_acao === 'REPROVACAO' && etapa.id) {
            chatMessages = await carregarMensagensChat(etapa.id);
        }

        historico.push({
            titulo: etapa.tipo_acao || 'Etapa',
            data: formatarDataHoraPDF(etapa.data_hora || new Date().toISOString()),
            descricao: etapa.descricao || '',
            usuario: etapa.usuario_nome || 'Nao identificado',
            justificativa: etapa.justificativa || '',
            chatMessages,
            tipo: etapa.tipo_acao === 'REPROVACAO' ? 'REPROVACAO' : 'OUTRO'
        });
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

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

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
        title: { size: 16 },
        section: { size: 12 },
        normal: { size: 10 },
        small: { size: 9 },
        tiny: { size: 8 }
    };

    function addTextWithSpacing(text, x, positionY, maxWidth, fontSize = styles.normal.size, style = 'normal', lineHeight = 6) {
        if (!text) {
            return { height: 0, lines: [] };
        }

        doc.setFontSize(fontSize);
        doc.setFont(undefined, style);
        const lines = doc.splitTextToSize(String(text), maxWidth);
        doc.text(lines, x, positionY);

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
        if (!checkSpace(30)) {
            newPage();
        }

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
    doc.text('RELATORIO TECNICO - WORKFLOW', margin, 15);
    doc.setFontSize(styles.small.size);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, 22);
    y = 35;

    addSection('INFORMACOES GERAIS DO WORKFLOW');

    [
        ['Titulo:', workflowData.titulo],
        ['Descricao:', workflowData.descricao],
        ['Status:', workflowData.status],
        ['Prioridade:', workflowData.prioridade],
        ['Categoria:', workflowData.categoria],
        ['Criado por:', workflowData.criador],
        ['Data de criacao:', workflowData.dataCriacao],
        ['Prazo final:', workflowData.prazoFinal],
        ['ID do workflow:', workflowData.id]
    ].forEach(([label, value]) => {
        if (!checkSpace(15)) {
            newPage();
            addSection('INFORMACOES GERAIS DO WORKFLOW (CONTINUACAO)');
        }

        doc.setFontSize(styles.normal.size);
        doc.setFont(undefined, 'bold');
        doc.text(label, margin, y);
        doc.setFont(undefined, 'normal');
        const result = addTextWithSpacing(value, margin + 45, y, contentWidth - 50, styles.normal.size, 'normal', 5);
        y += Math.max(6, result.height) + 4;
    });

    y += 12;
    addSection('RESPONSAVEIS');

    if (responsaveis.length) {
        responsaveis.forEach((responsavel, index) => {
            if (!checkSpace(20)) {
                newPage();
                addSection('RESPONSAVEIS (CONTINUACAO)');
            }

            doc.setFontSize(styles.normal.size);
            doc.setFont(undefined, 'bold');
            doc.text(`${index + 1}. ${responsavel.nome}`, margin, y);
            doc.setFontSize(styles.small.size);
            doc.setFont(undefined, 'normal');
            doc.text(`Login: ${responsavel.login}`, margin + 10, y + 6);
            y += 18;
        });
    } else {
        doc.setFontSize(styles.normal.size);
        doc.text('Nenhum responsavel atribuido', margin, y);
        y += 14;
    }

    y += 12;
    addSection('DOCUMENTOS ANEXOS');

    if (anexos.length) {
        anexos.forEach((anexo, index) => {
            if (!checkSpace(25)) {
                newPage();
                addSection('DOCUMENTOS ANEXOS (CONTINUACAO)');
            }

            doc.setFontSize(styles.normal.size);
            doc.setFont(undefined, 'bold');
            doc.text(`${index + 1}. ${anexo.nome}`, margin, y);
            doc.setFontSize(styles.small.size);
            doc.setFont(undefined, 'normal');
            doc.text(`Tamanho: ${anexo.tamanho}`, margin + 10, y + 6);
            doc.text(`Data: ${anexo.data}`, margin + 10, y + 12);
            y += 24;
        });
    } else {
        doc.setFontSize(styles.normal.size);
        doc.text('Nenhum documento anexado', margin, y);
        y += 14;
    }

    y += 12;
    addSection('HISTORICO DE ATIVIDADES');

    if (historico.length) {
        historico.forEach((item, index) => {
            const estimatedHeight = calcularAlturaAtividade(item, doc, contentWidth);
            if (!checkSpace(estimatedHeight)) {
                newPage();
                addSection('HISTORICO DE ATIVIDADES (CONTINUACAO)');
            }

            doc.setFillColor(245, 245, 245);
            doc.rect(margin, y, contentWidth, 14, 'F');
            doc.setDrawColor(200, 200, 200);
            doc.rect(margin, y, contentWidth, 14);
            doc.setFontSize(styles.normal.size);
            doc.setFont(undefined, 'bold');
            doc.text(`ATIVIDADE ${index + 1}: ${item.titulo}`, margin + 5, y + 9);
            y += 18;

            doc.setFontSize(styles.small.size);
            doc.setFont(undefined, 'normal');
            doc.text(`Data/Hora: ${item.data}`, margin, y);
            doc.text(`Responsavel: ${item.usuario}`, margin + contentWidth / 2, y);
            y += 12;

            if (item.descricao) {
                doc.setFont(undefined, 'bold');
                doc.text('Descricao:', margin, y);
                y += 8;
                doc.setFont(undefined, 'normal');
                const descResult = addTextWithSpacing(item.descricao, margin + 5, y, contentWidth - 10, styles.small.size, 'normal', 6);
                y += descResult.height + 10;
            }

            if (item.justificativa) {
                doc.setFontSize(styles.small.size);
                doc.setFont(undefined, 'bold');
                doc.text('Justificativa:', margin, y);
                y += 8;
                const justResult = addTextWithSpacing(item.justificativa, margin + 5, y, contentWidth - 10, styles.tiny.size, 'normal', 5);
                y += justResult.height + 12;
            }

            if (item.tipo === 'REPROVACAO' && item.chatMessages.length) {
                doc.setFontSize(styles.small.size);
                doc.setFont(undefined, 'bold');
                doc.text('HISTORICO DE COMUNICACAO:', margin, y);
                y += 10;

                item.chatMessages.forEach((message) => {
                    if (!checkSpace(35)) {
                        newPage();
                        addSection('HISTORICO DE ATIVIDADES (CONTINUACAO)');
                    }

                    const messageStartY = y;
                    const dataHora = formatarDataHoraPDF(message.data_hora || new Date().toISOString());

                    doc.setFillColor(250, 250, 250);
                    doc.rect(margin, y, contentWidth, 28, 'F');
                    doc.setDrawColor(200, 200, 200);
                    doc.rect(margin, y, contentWidth, 28);

                    doc.setFontSize(styles.tiny.size);
                    doc.setFont(undefined, 'bold');
                    doc.text(`${message.usuario || 'Usuario'} - ${dataHora}`, margin + 5, y + 7);

                    const messageResult = addTextWithSpacing(message.justificativa || '', margin + 5, y + 14, contentWidth - 10, styles.tiny.size, 'normal', 4.5);
                    const neededHeight = Math.max(28, 20 + messageResult.height);

                    if (neededHeight > 28) {
                        doc.setFillColor(250, 250, 250);
                        doc.rect(margin, messageStartY, contentWidth, neededHeight, 'F');
                        doc.setDrawColor(200, 200, 200);
                        doc.rect(margin, messageStartY, contentWidth, neededHeight);
                    }

                    y += neededHeight + 8;
                });

                y += 6;
            }

            if (index < historico.length - 1) {
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, y, pageWidth - margin, y);
                y += 15;
            }
        });
    } else {
        doc.setFontSize(styles.normal.size);
        doc.text('Nenhuma atividade registrada no sistema', margin, y);
        y += 16;
    }

    const totalPages = doc.internal.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        const footerY = doc.internal.pageSize.getHeight() - footerHeight + 5;

        doc.setDrawColor(200, 200, 200);
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
        doc.setFontSize(styles.tiny.size);
        doc.setTextColor(100, 100, 100);
        doc.text(`Workflow ID: ${workflowData.id}`, margin, footerY);
        doc.text(`Pagina ${page} de ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });
        doc.text('Sistema de Gestao de Workflows', pageWidth - margin, footerY, { align: 'right' });
        doc.setTextColor(0, 0, 0);
    }
}

function calcularAlturaAtividade(item, doc, contentWidth) {
    let altura = 45;

    if (item.descricao) {
        const lines = doc.splitTextToSize(item.descricao, contentWidth - 10);
        altura += 18 + (lines.length * 6);
    }

    if (item.justificativa) {
        const lines = doc.splitTextToSize(item.justificativa, contentWidth - 10);
        altura += 20 + (lines.length * 5);
    }

    if (item.tipo === 'REPROVACAO' && item.chatMessages.length > 0) {
        altura += 16;
        item.chatMessages.forEach((message) => {
            const msgLines = doc.splitTextToSize(message.justificativa || '', contentWidth - 10);
            altura += 36 + (msgLines.length * 4.5);
        });
    }

    return altura + 15;
}

function formatarDataHoraPDF(dataHoraString) {
    try {
        return new Date(dataHoraString).toLocaleString('pt-BR', {
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

function formatarTamanhoArquivo(bytes) {
    if (!bytes || bytes === 0) {
        return '0 Bytes';
    }

    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / (1024 ** index);

    return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const btnGerarPDF = document.getElementById('btnGerarPDF');
    if (btnGerarPDF) {
        btnGerarPDF.addEventListener('click', gerarRelatorioPDF);
    }
});

window.gerarRelatorioPDF = gerarRelatorioPDF;
