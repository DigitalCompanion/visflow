import { Module } from 'vuex';
import { RootState } from '@/store/types';
import VueRouter from 'vue-router';

export interface RouterState {
  router: VueRouter | undefined;
  lastUrl: string;
}

const initialState: RouterState = {
  router: undefined,
  lastUrl: '/',
};

const mutations = {
  setRouter(state: RouterState, router_: VueRouter) {
    state.router = router_;
  },

  replace(state: RouterState, url: string) {
    state.lastUrl = url;
    if (state.router) {
      state.router.replace(url);
    }
  },

  /**
   * Completely reloads and refreshes the page. This will lose all the states.
   */
  reload(state: RouterState, url: string) {
    window.location.href = url;
  },
};

const router: Module<RouterState, RootState> = {
  namespaced: true,
  state: initialState,
  mutations,
};

export default router;
