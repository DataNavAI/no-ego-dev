export class ProjectError extends Error {
  constructor(code,status,message) {super(message);this.code=code;this.status=status;}
}
