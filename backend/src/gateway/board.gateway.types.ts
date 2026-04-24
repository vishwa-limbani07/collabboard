export interface UserData {
  userId: string;
  userName: string;
  boardId: string;
}

export interface JoinBoardData {
  userId: string;
  userName: string;
  boardId: string;
}

export interface DrawData {
  boardId: string;
  stroke: any;
}

export interface CursorMoveData {
  boardId: string;
  cursor: any;
}

export interface ShapeData {
  boardId: string;
  shape: any;
}

export interface StickyData {
  boardId: string;
  sticky: any;
}

export interface UndoData {
  boardId: string;
  actionId: string;
}

export interface ClearBoardData {
  boardId: string;
}
