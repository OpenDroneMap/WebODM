import React from 'react';
import { shallow } from 'enzyme';
import ExportAssetPanel from '../ExportAssetPanel';

const taskMock = require('../../tests/utils/MockLoader').load("task.json");

describe('<ExportAssetPanel />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<ExportAssetPanel
        asset={"orthophoto"}
        task={taskMock} />);
    expect(wrapper.exists()).toBe(true);
  })
});