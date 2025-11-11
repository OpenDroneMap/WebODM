import React from 'react';
import { mount } from 'enzyme';
import PdfPopup from '../PdfPopup';

describe('<PdfPopup />', () => {
    it('renders without exploding', () => {
      const wrapper = mount(<PdfPopup url="/test.pdf" onClose={() => {}} />);
      expect(wrapper.exists()).toBe(true);
    })
  });
