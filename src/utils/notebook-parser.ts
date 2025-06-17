export interface NotebookCell {
  cell_type: 'code' | 'markdown' | 'raw';
  source: string[];
  outputs?: NotebookOutput[];
  execution_count?: number | null;
  metadata?: Record<string, any>;
}

export interface NotebookOutput {
  output_type: 'execute_result' | 'display_data' | 'stream' | 'error';
  data?: Record<string, any>;
  text?: string[];
  name?: string;
  ename?: string;
  evalue?: string;
  traceback?: string[];
  execution_count?: number;
}

export interface NotebookData {
  cells: NotebookCell[];
  metadata: {
    kernelspec?: {
      display_name: string;
      language: string;
      name: string;
    };
    language_info?: {
      name: string;
      version: string;
    };
  };
  nbformat: number;
  nbformat_minor: number;
}

export interface ParsedNotebook {
  title: string;
  cells: ParsedCell[];
  metadata: NotebookData['metadata'];
  executionCount: number;
}

export interface ParsedCell {
  id: string;
  type: 'code' | 'markdown' | 'raw';
  source: string;
  outputs: ParsedOutput[];
  executionCount?: number | null;
}

export interface ParsedOutput {
  type: 'text' | 'html' | 'image' | 'json' | 'error';
  content: string;
  mimeType?: string;
}

export class NotebookParser {
  static parse(notebookJson: NotebookData): ParsedNotebook {
    const cells = notebookJson.cells.map((cell, index) => 
      this.parseCell(cell, index)
    );
    
    // 尝试从第一个 markdown 单元格提取标题
    const title = this.extractTitle(cells);
    
    // 计算总执行次数
    const executionCount = cells
      .filter(cell => cell.executionCount !== null)
      .length;
    
    return {
      title,
      cells,
      metadata: notebookJson.metadata,
      executionCount
    };
  }
  
  private static parseCell(cell: NotebookCell, index: number): ParsedCell {
    const source = Array.isArray(cell.source) 
      ? cell.source.join('') 
      : cell.source;
    
    const outputs = cell.outputs 
      ? cell.outputs.map(output => this.parseOutput(output))
      : [];
    
    return {
      id: `cell-${index}`,
      type: cell.cell_type,
      source: source.trim(),
      outputs,
      executionCount: cell.execution_count
    };
  }
  
  private static parseOutput(output: NotebookOutput): ParsedOutput {
    switch (output.output_type) {
      case 'stream':
        return {
          type: 'text',
          content: Array.isArray(output.text) 
            ? output.text.join('') 
            : output.text || ''
        };
      
      case 'execute_result':
      case 'display_data':
        if (output.data) {
          // 处理不同的 MIME 类型
          if (output.data['text/html']) {
            return {
              type: 'html',
              content: Array.isArray(output.data['text/html'])
                ? output.data['text/html'].join('')
                : output.data['text/html'],
              mimeType: 'text/html'
            };
          }
          
          if (output.data['image/png']) {
            return {
              type: 'image',
              content: output.data['image/png'],
              mimeType: 'image/png'
            };
          }
          
          if (output.data['image/jpeg']) {
            return {
              type: 'image',
              content: output.data['image/jpeg'],
              mimeType: 'image/jpeg'
            };
          }
          
          if (output.data['application/json']) {
            return {
              type: 'json',
              content: JSON.stringify(output.data['application/json'], null, 2),
              mimeType: 'application/json'
            };
          }
          
          if (output.data['text/plain']) {
            return {
              type: 'text',
              content: Array.isArray(output.data['text/plain'])
                ? output.data['text/plain'].join('')
                : output.data['text/plain'],
              mimeType: 'text/plain'
            };
          }
        }
        break;
      
      case 'error':
        const errorContent = [
          `${output.ename}: ${output.evalue}`,
          ...(output.traceback || [])
        ].join('\n');
        
        return {
          type: 'error',
          content: errorContent
        };
    }
    
    return {
      type: 'text',
      content: 'Unsupported output type'
    };
  }
  
  private static extractTitle(cells: ParsedCell[]): string {
    // 查找第一个 markdown 单元格中的 h1 标题
    const firstMarkdownCell = cells.find(cell => cell.type === 'markdown');
    
    if (firstMarkdownCell) {
      const lines = firstMarkdownCell.source.split('\n');
      const titleLine = lines.find(line => line.startsWith('# '));
      
      if (titleLine) {
        return titleLine.replace('# ', '').trim();
      }
    }
    
    return 'Untitled Notebook';
  }
  
  static async loadNotebook(notebookPath: string): Promise<ParsedNotebook> {
    try {
      // 在实际使用中，这里会从文件系统读取
      // 目前返回示例数据
      const notebookData = await this.fetchNotebookData(notebookPath);
      return this.parse(notebookData);
    } catch (error) {
      console.error('Failed to load notebook:', error);
      throw new Error(`Failed to load notebook: ${notebookPath}`);
    }
  }
  
  private static async fetchNotebookData(path: string): Promise<NotebookData> {
    // 这里应该实现实际的文件读取逻辑
    // 目前返回示例数据
    return {
      cells: [
        {
          cell_type: 'markdown',
          source: ['# RLHF 实验分析\n\n本笔记展示了 RLHF 训练过程的详细分析。'],
          metadata: {}
        },
        {
          cell_type: 'code',
          source: [
            'import numpy as np\n',
            'import matplotlib.pyplot as plt\n',
            'import pandas as pd\n',
            '\n',
            '# 加载实验数据\n',
            'data = pd.read_csv("rlhf_training_logs.csv")\n',
            'print(f"数据形状: {data.shape}")'
          ],
          outputs: [
            {
              output_type: 'stream',
              name: 'stdout',
              text: ['数据形状: (1000, 5)\n']
            }
          ],
          execution_count: 1,
          metadata: {}
        },
        {
          cell_type: 'code',
          source: [
            '# 绘制训练损失曲线\n',
            'plt.figure(figsize=(10, 6))\n',
            'plt.plot(data["step"], data["policy_loss"], label="Policy Loss")\n',
            'plt.plot(data["step"], data["value_loss"], label="Value Loss")\n',
            'plt.xlabel("Training Steps")\n',
            'plt.ylabel("Loss")\n',
            'plt.title("RLHF Training Loss Curves")\n',
            'plt.legend()\n',
            'plt.grid(True)\n',
            'plt.show()'
          ],
          outputs: [
            {
              output_type: 'display_data',
              data: {
                'image/png': 'iVBORw0KGgoAAAANSUhEUgAAA...(base64 encoded image)...',
                'text/plain': ['<Figure size 1000x600 with 1 Axes>']
              }
            }
          ],
          execution_count: 2,
          metadata: {}
        }
      ],
      metadata: {
        kernelspec: {
          display_name: 'Python 3',
          language: 'python',
          name: 'python3'
        },
        language_info: {
          name: 'python',
          version: '3.9.0'
        }
      },
      nbformat: 4,
      nbformat_minor: 4
    };
  }
}