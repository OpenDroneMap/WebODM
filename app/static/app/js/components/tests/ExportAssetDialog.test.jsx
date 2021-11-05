import React from 'react';
import { shallow } from 'enzyme';
import ExportAssetDialog from '../ExportAssetDialog';

const taskMock = require('../../tests/utils/MockLoader').load("task.json");

describe('<ExportAssetDialog />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<ExportAssetDialog onHide={() => {}}
        asset={"orthophoto"}
        task={taskMock} />);
    expect(wrapper.exists()).toBe(true);
  })
});