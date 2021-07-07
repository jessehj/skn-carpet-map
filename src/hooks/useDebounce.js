import { useCallback, useState } from "react";
import _ from "lodash";

export const useDebounce = (obj = null, wait = 500) => {
  const [state, setState] = useState(obj);
  const setDebouncedState = (_val) => {
    debounce(_val);
  };
  const debounce = useCallback(
    _.debounce((_props) => {
      setState(_props);
    }, wait),
    []
  );
  return [state, setDebouncedState];
};
