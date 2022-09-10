import DataUpdater from "./DataUpdater.mjs";

export default class StageScheduleUpdater extends DataUpdater
{
  name = 'Schedules';
  filename = 'schedules.json';

  getData() {
    return this.splatnet.getStageScheduleData();
  }
}
