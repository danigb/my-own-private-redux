// # My own private redux
import React, { Component, PropTypes } from "react";

// ## 1. Reducers

export const combineReducers = reducers => (state = {}, action) => {
  return Object.keys(reducers).reduce((nextState, key) => {
    nextState[key] = reducers[key](state[key], action)
    return nextState
  }, {});
};

// ## 2. Store

export const createStore = (reducer, middleware) => {
  let state;
  const subscribers = [];
  const coreDispatch = action => {
    state = reducer(state, action);
    subscribers.forEach(handler => handler());
  };
  const getState = () => state;
  const store = {
    dispatch: coreDispatch,
    getState,
    subscribe: handler => {
      subscribers.push(handler);
      return () => {
        const index = subscribers.indexOf(handler)
        if (index > 0) {
          subscribers.splice(index, 1);
        }
      };
    }
  };
  if (middleware) {
    const dispatch = action => store.dispatch(action);
    store.dispatch = middleware({
      dispatch,
      getState
    })(coreDispatch);
  }
  coreDispatch({type: '@@redux/INIT'});
  return store;
};

// ## 3. Middleware

export const loggingMiddleware = ({ active }) => ({ getState }) => next => action => {
  if (!active) return next(action)
  console.info('before', getState());
  console.info('action', action);
  const result = next(action);
  console.info('after', getState());
  return result;
};

export const thunkMiddleware = () => ({dispatch, getState}) => next => action => {
  if (typeof action === 'function') {
    return action({dispatch, getState});
  }
  return next(action);
};

export const applyMiddleware = (...middlewares) => store => {
  if (middlewares.length === 0) {
    return dispatch => dispatch;
  }
  if (middlewares.length === 1) {
    return middlewares[0];
  }
  const boundMiddlewares = middlewares.map(middleware =>
    middleware(store)
  );
  return boundMiddlewares.reduce((a, b) =>
    next => a(b(next))
  );
};

// ## 2. Provider (react-redux)

export class Provider extends Component {
  getChildContext() {
    return {
      store: this.props.store
    };
  }
  render() {
    return this.props.children;
  }
}

Provider.childContextTypes = {
  store: PropTypes.object
};

// # 3. connect (react-redux)

export const connect = (
  mapStateToProps = () => ({}),
  mapDispatchToProps = () => ({})
) => Component => {
  class Connected extends React.Component {
    onStoreOrPropsChange(props) {
      const { store } = this.context;
      const state = store.getState();
      const stateProps = mapStateToProps(state, props);
      const dispatchProps = mapDispatchToProps(store.dispatch, props);
      this.setState({
        ...stateProps,
        ...dispatchProps
      });
    }
    componentWillMount() {
      const { store } = this.context;
      this.onStoreOrPropsChange(this.props);
      this.unsubscribe = store.subscribe(() =>
        this.onStoreOrPropsChange(this.props)
      );
    }
    componentWillReceiveProps(nextProps) {
      this.onStoreOrPropsChange(nextProps);
    }
    componentWillUnmount() {
      this.unsubscribe();
    }
    render() {
      return <Component {...this.props} {...this.state} />;
    }
  }

  Connected.contextTypes = {
    store: PropTypes.object
  };

  return Connected;
};
