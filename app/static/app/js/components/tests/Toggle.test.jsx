import React from 'react';
import { mount } from 'enzyme';
import { Checkbox, ExpandButton } from '../Toggle';

describe('<Checkbox />', () => {
    it('renders without exploding', () => {
      const self = {
          state:{
              visible: true
          },
          setState: () => {}
      };

      const wrapper = mount(<Checkbox bind={[self, 'visible']}  />);
      expect(wrapper.exists()).toBe(true);
    })
});

describe('<ExpandButton />', () => {
    it('renders without exploding', () => {
      const self = {
          state:{
              visible: true
          },
          setState: () => {}
      };

      const wrapper = mount(<ExpandButton bind={[self, 'visible']}  />);
      expect(wrapper.exists()).toBe(true);
    })
});