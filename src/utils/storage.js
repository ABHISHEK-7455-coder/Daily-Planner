const STORAGE_KEY = "dailyPlannerData";

export const loadAllDays = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
};

export const saveAllDays = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const getDayData = (date) => {
    const all = loadAllDays();
    return all[date] || {
        date,
        tasks: [],
        reflection: null
    };
};

export const saveDayData = (date, dayData) => {
    const all = loadAllDays();
    all[date] = dayData;
    saveAllDays(all);
};
