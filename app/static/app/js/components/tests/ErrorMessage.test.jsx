import React from 'react';
import { shallow } from 'enzyme';
import ErrorMessage from '../ErrorMessage';

class MockComponent extends React.Component {
	constructor(props){
		super(props);
		
		this.state = {
			error: 'My error'
		};
	}
}

describe('<ErrorMessage />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<ErrorMessage bind={[new MockComponent(), 'error']} />);
    expect(wrapper.exists()).toBe(true);
  })
});