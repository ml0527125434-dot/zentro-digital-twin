/**
 * Zentro Digital Twin — Build-Mode context (Stage 1A)
 *
 * Canvas UI lens flag, read by edges/nodes that must stay *static* while the
 * Builder (edit) lens is active. Per Master Spec pid-spec §1.8: "Animation is
 * Monitor-only / live-data-only. In Build Mode pipes are static."
 *
 * Provided once by FlowMap around <ReactFlow>; custom edges consume it.
 * Default `false` keeps Monitor (the non-build lens) animated.
 */
import { createContext } from 'react';

export const BuildModeContext = createContext<boolean>(false);
