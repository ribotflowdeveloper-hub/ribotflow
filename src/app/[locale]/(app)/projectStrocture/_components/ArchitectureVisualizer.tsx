/**
 * @file ArchitectureVisualizer.tsx
 * @summary Component de client que renderitza el diagrama interactiu de l'arquitectura.
 * ✅ VERSIÓ FINAL: Inclou disseny horitzontal, selector de branques, nodes personalitzats amb colors,
 * cerca, carpetes plegables i visualitzador de codi.
 */

"use client";

import React, { useState, useEffect, useCallback, useTransition, FC } from 'react';
import ReactFlow, { 
    Controls, Background, applyNodeChanges, applyEdgeChanges, Handle, Position, addEdge,
    type Node, type Edge, type OnNodesChange, type OnEdgesChange, type NodeProps, type Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';

import { fetchProjectStructureAction, fetchFileContentAction, fetchBranchesAction, type FileTreeNode } from '../actions';
import { Loader2, File, Folder, Database, Server, Component, Settings, FileCode, X, Search, Expand, Shrink, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- Tipus de Dades ---
type CustomNodeData = { label: string; type: string; path: string; nodeType: 'tree' | 'blob'; isCollapsed?: boolean; isDimmed?: boolean; };
type CustomNode = Node<CustomNodeData>;

// --- Components de Nodes Personalitzats ---
const nodeIcons: Record<string, React.ElementType> = {
    root: Server, folder: Folder, supabaseFn: Database, serverAction: Server,
    serverPage: FileCode, clientComponent: Component, layout: FileCode,
    config: Settings, default: File,
};
const nodeColors: Record<string, string> = {
    root: 'bg-purple-600 border-purple-400', folder: 'bg-blue-600 border-blue-400',
    supabaseFn: 'bg-green-600 border-green-400', serverAction: 'bg-orange-600 border-orange-400',
    serverPage: 'bg-indigo-600 border-indigo-400', clientComponent: 'bg-pink-600 border-pink-400',
    layout: 'bg-rose-600 border-rose-400', config: 'bg-gray-500 border-gray-300',
    default: 'bg-gray-700 border-gray-500',
};

const CustomNodeComponent: FC<NodeProps<CustomNodeData>> = ({ data }) => {
    const Icon = nodeIcons[data.type] || (data.nodeType === 'tree' ? Folder : File);
    const colors = nodeColors[data.type] || nodeColors.default;
    return (
        <div className={cn("rounded-lg p-4 text-white font-sans shadow-lg flex items-center gap-4 border-2 min-w-[240px] transition-opacity", colors, data.isDimmed && "opacity-30")}>
            <Handle type="target" position={Position.Left} className="!bg-gray-400 opacity-50" />
            <Icon className="w-6 h-6 flex-shrink-0" />
            <div className="flex-grow">
                <div className="text-base font-bold">{data.label}</div>
            </div>
            {data.nodeType === 'tree' && (data.isCollapsed ? <Expand className="w-5 h-5" /> : <Shrink className="w-5 h-5" />)}
            <Handle type="source" position={Position.Right} className="!bg-gray-400 opacity-50" />
        </div>
    );
};
const nodeTypes = { custom: CustomNodeComponent };

// --- Funció de Transformació de Dades ---
const transformDataToFlow = (fileTree: FileTreeNode[]): { nodes: CustomNode[], edges: Edge[] } => {
    const nodes: CustomNode[] = [];
    const edges: Edge[] = [];
    const nodeMap = new Map<string, CustomNode>();

    const getNodeType = (path: string): string => {
        if (path.includes('supabase/functions')) return 'supabaseFn';
        if (path.endsWith('actions.ts')) return 'serverAction';
        if (path.endsWith('page.tsx')) return 'serverPage';
        if (path.includes('client.tsx') || path.includes('Client.tsx')) return 'clientComponent';
        if (path.endsWith('layout.tsx')) return 'layout';
        if (path.endsWith('middleware.ts')) return 'config';
        return 'default';
    }

    const rootNode: CustomNode = { id: 'root', data: { label: 'Projecte Ribot', type: 'root', path: '/', nodeType: 'tree' }, position: { x: 0, y: 0 }, type: 'custom' };
    nodes.push(rootNode);
    nodeMap.set('root', rootNode);

    fileTree.forEach(item => {
        const pathParts = item.path.split('/');
        let currentPath = '';
        pathParts.forEach((part, index) => {
            const previousPath = currentPath;
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            if (!nodeMap.has(currentPath)) {
                const isLastPart = index === pathParts.length - 1;
                const newNode: CustomNode = {
                    id: currentPath,
                    data: { label: part, type: isLastPart && item.type === 'blob' ? getNodeType(currentPath) : 'folder', path: currentPath, nodeType: isLastPart ? item.type : 'tree' },
                    position: { x: 0, y: 0 },
                    type: 'custom',
                };
                nodes.push(newNode);
                nodeMap.set(currentPath, newNode);
                const parentNodeId = index === 0 ? 'root' : previousPath;
                edges.push({ id: `e-${parentNodeId}-${currentPath}`, source: parentNodeId, target: currentPath, type: 'smoothstep' });
            }
        });
    });
    
    const levels: Map<number, CustomNode[]> = new Map();
    nodes.forEach(node => {
        const level = node.id === 'root' ? 0 : node.id.split('/').length;
        if (!levels.has(level)) levels.set(level, []);
        levels.get(level)!.push(node);
    });
    levels.forEach((nodesAtLevel, level) => {
        const levelHeight = nodesAtLevel.length * 100;
        nodesAtLevel.forEach((node, index) => {
            node.position = {
                x: level * 350,
                y: index * 100 - (levelHeight / 2)
            };
        });
    });

    return { nodes, edges };
};

// --- Component Principal ---
export function ArchitectureVisualizer() {
    const [allNodes, setAllNodes] = useState<CustomNode[]>([]);
    const [allEdges, setAllEdges] = useState<Edge[]>([]);
    const [nodes, setNodes] = useState<CustomNode[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingFile, setViewingFile] = useState<{ path: string; content: string } | null>(null);
    const [isCodeLoading, startCodeLoadingTransition] = useTransition();
    const [searchTerm, setSearchTerm] = useState('');
    const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
    const [branches, setBranches] = useState<string[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>('main');

    const onNodesChange: OnNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    const onEdgesChange: OnEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
    const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge({ ...connection, type: 'smoothstep', animated: true }, eds)), []);

    const handleNodeDoubleClick = useCallback((_: React.MouseEvent, node: CustomNode) => {
        if (node.data.nodeType === 'blob') {
            startCodeLoadingTransition(async () => {
                setViewingFile({ path: node.data.path, content: "Carregant contingut del fitxer..." });
                const result = await fetchFileContentAction(node.data.path);
                setViewingFile({ path: node.data.path, content: result.data || `Error: ${result.error}` });
            });
        }
    }, []);

    const handleNodeClick = useCallback((_: React.MouseEvent, node: CustomNode) => {
        if (node.data.nodeType === 'tree') {
            setCollapsedNodes(prev => ({ ...prev, [node.id]: !prev[node.id] }));
        }
    }, []);

    useEffect(() => {
        const loadStructure = async () => {
            setIsLoading(true);
            const result = await fetchProjectStructureAction(selectedBranch);
            if (result.data) {
                const { nodes: initialNodes, edges: initialEdges } = transformDataToFlow(result.data);
                setAllNodes(initialNodes);
                setAllEdges(initialEdges);
            } else {
                console.error(result.error);
            }
            setIsLoading(false);
        };
        if(selectedBranch) loadStructure();
    }, [selectedBranch]);

    useEffect(() => {
        const loadBranches = async () => {
            const result = await fetchBranchesAction();
            if (result.data) {
                setBranches(result.data);
                if (!result.data.includes('main')) {
                    setSelectedBranch(result.data[0] || '');
                }
            }
        };
        loadBranches();
    }, []);

    useEffect(() => {
        let visibleNodes = [...allNodes];
        if (searchTerm.trim()) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            const matchingNodeIds = new Set<string>();
            allNodes.forEach(n => {
                if (n.data.label.toLowerCase().includes(lowerCaseSearch)) {
                    matchingNodeIds.add(n.id);
                    let parentId = allEdges.find(e => e.target === n.id)?.source;
                    while (parentId) {
                        matchingNodeIds.add(parentId);
                        parentId = allEdges.find(e => e.target === parentId)?.source;
                    }
                }
            });
            visibleNodes = allNodes.map(n => ({...n, data: { ...n.data, isDimmed: !matchingNodeIds.has(n.id) }}));
        } else {
            visibleNodes = allNodes.map(n => ({...n, data: { ...n.data, isDimmed: false }}));
        }

        const hiddenNodeIds = new Set<string>();
        Object.entries(collapsedNodes).forEach(([nodeId, isCollapsed]) => {
            if (isCollapsed) {
                const findDescendants = (id: string) => {
                    allEdges.forEach(edge => {
                        if (edge.source === id) {
                            hiddenNodeIds.add(edge.target);
                            findDescendants(edge.target);
                        }
                    });
                };
                findDescendants(nodeId);
            }
        });
        
        const finalNodes = visibleNodes.map(n => ({ ...n, hidden: hiddenNodeIds.has(n.id), data: {...n.data, isCollapsed: !!collapsedNodes[n.id]} }));
        setNodes(finalNodes);
        setEdges(allEdges.filter(e => !hiddenNodeIds.has(e.source) && !hiddenNodeIds.has(e.target)));

    }, [searchTerm, collapsedNodes, allNodes, allEdges]);

    if (isLoading && nodes.length === 0) {
        return <div className="flex items-center justify-center h-full text-white"><Loader2 className="w-8 h-8 animate-spin" /><p className="ml-4 text-lg">Construint el diagrama des de GitHub...</p></div>;
    }

    return (
        <div className="h-full w-full bg-gray-900 rounded-lg overflow-hidden relative font-sans flex flex-col">
            <div className="absolute top-4 left-4 z-10 text-white bg-black/40 p-3 rounded-lg shadow-lg backdrop-blur-sm flex items-center gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="Cerca un fitxer..." className="pl-9 bg-gray-800/50 border-gray-600" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-gray-400" />
                    <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={branches.length === 0}>
                        <SelectTrigger className="w-[180px] bg-gray-800/50 border-gray-600">
                            <SelectValue placeholder="Carregant branques..." />
                        </SelectTrigger>
                        <SelectContent>
                            {branches.map(branch => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
                onNodeDoubleClick={handleNodeDoubleClick} onNodeClick={handleNodeClick}
                fitView nodeTypes={nodeTypes} proOptions={{ hideAttribution: true }} className="bg-dots">
                <Controls />
                <Background color="#4B5563" />
            </ReactFlow>

            <Dialog open={!!viewingFile} onOpenChange={(isOpen) => !isOpen && setViewingFile(null)}>
                <DialogContent className="max-w-5xl h-[90vh] flex flex-col bg-gray-900/90 backdrop-blur-sm border-gray-700 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex justify-between items-center font-mono text-lg">{viewingFile?.path}<Button variant="ghost" size="icon" onClick={() => setViewingFile(null)}><X className="w-4 h-4" /></Button></DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto bg-[#282c34] rounded-md p-1 editor-container-class">
                        {isCodeLoading && !viewingFile?.content.startsWith('Error') ? (
                           <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin"/></div>
                        ) : (
                            <Editor value={viewingFile?.content || ''} onValueChange={() => {}} highlight={(code) => highlight(code, languages.tsx, 'tsx')} padding={16} className="font-mono text-sm" style={{ minHeight: '100%'}}/>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

