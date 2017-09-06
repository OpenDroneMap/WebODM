import React from 'react';
import { shallow } from 'enzyme';
import FormDialog from '../FormDialog';

describe('<FormDialog />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<FormDialog 
    	getFormData={() => {}}
		reset={() => {}}
		saveAction={() => {}} />);
    expect(wrapper.exists()).toBe(true);
  })
});