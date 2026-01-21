export const formatDate = (date) =>
    new Date(date).toDateString();

export const getPrevDate = (date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
};

export const getNextDate = (date) => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
};
