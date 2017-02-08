class ProcessingException(Exception):
    pass


class ProcessingError(ProcessingException):
    pass


class ProcessingTimeout(ProcessingException):
    pass