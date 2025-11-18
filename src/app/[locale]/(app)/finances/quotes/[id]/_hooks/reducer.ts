import { type EditorState, type EditorAction } from "@/types/finances/quotes"; // O la ruta correcta on tinguis els tipus locals

// ❌ HEM ELIMINAT 'initialState' D'AQUÍ.
// L'estat inicial es construeix dins de 'index.ts' amb les dades reals.

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "SET_QUOTE":
      return { ...state, quote: action.payload };

    case "UPDATE_QUOTE_FIELD":
      return {
        ...state,
        quote: {
          ...state.quote,
          [action.payload.field]: action.payload.value,
        },
      };

    case "SET_TEAM_DATA":
      return { ...state, currentTeamData: action.payload };

    case "SET_OPPORTUNITIES":
      return { ...state, contactOpportunities: action.payload };

    case "SET_DELETE_DIALOG":
      return { ...state, isDeleteDialogOpen: action.payload };

    case "SET_PROFILE_DIALOG":
      return { ...state, isProfileDialogOpen: action.payload };

    case "SET_SENDING_STATUS":
      return { ...state, sendingStatus: action.payload };

    default:
      return state;
  }
}